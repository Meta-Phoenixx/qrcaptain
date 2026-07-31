import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireMechanicVesselAccess } from "./lib/auth";
import { requireNonNegative, requireMaxLength, clampLimit } from "./lib/validate";
import { logAudit } from "./lib/audit";
import { Doc } from "./_generated/dataModel";
import { computeServicePrediction } from "./lib/servicePredictor";

export { computeServicePrediction };

export const logEngineHours = mutation({
  args: {
    vesselId: v.id("vessels"),
    equipmentId: v.id("vesselEquipment"),
    hours: v.number(),
    serviceLabel: v.optional(v.string()),
    notes: v.optional(v.string()),
    gpsLat: v.optional(v.number()),
    gpsLng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);

    // Mechanic, owner/fleet_manager, or admin can log hours
    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) throw new Error("Vessel not found");

    let isMechanicAuthorized = false;
    if (user.role === "mechanic") {
      const vesselAuth = await ctx.db
        .query("mechanicAuthorizations")
        .withIndex("by_vessel_mechanic", (q) => q.eq("vesselId", args.vesselId).eq("mechanicId", userId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();
      if (vesselAuth) {
        isMechanicAuthorized = true;
      } else if (vessel.fleetId) {
        const fleetAuth = await ctx.db
          .query("fleetMechanicAuthorizations")
          .withIndex("by_fleet_mechanic", (q) => q.eq("fleetId", vessel.fleetId!).eq("mechanicId", userId))
          .filter((q) => q.eq(q.field("isActive"), true))
          .first();
        isMechanicAuthorized = !!fleetAuth;
      }
    }
    const isOwnerClass = (user.role === "owner" || user.role === "fleet_manager") && vessel.ownerId === userId;
    if (!isMechanicAuthorized && !isOwnerClass && user.role !== "admin") {
      throw new Error("Access denied");
    }

    requireNonNegative(args.hours, "Engine hours");
    if (args.serviceLabel) requireMaxLength(args.serviceLabel, "Service label", 100);

    const equipment = await ctx.db.get(args.equipmentId);
    if (!equipment || equipment.vesselId !== args.vesselId) throw new Error("Equipment not found on this vessel");

    const logId = await ctx.db.insert("engineHoursLog", {
      vesselId: args.vesselId,
      equipmentId: args.equipmentId,
      recordedBy: userId,
      hours: args.hours,
      serviceLabel: args.serviceLabel,
      notes: args.notes,
      gpsLat: args.gpsLat,
      gpsLng: args.gpsLng,
      recordedAt: Date.now(),
    });

    // Keep vesselEquipment.currentHours in sync
    if (args.hours > (equipment.currentHours ?? 0)) {
      await ctx.db.patch(args.equipmentId, { currentHours: args.hours });
    }

    // Check service status and notify fleet manager if applicable
    if (vessel.fleetId && equipment.serviceIntervalHours) {
      const allLogs = await ctx.db.query("engineHoursLog")
        .withIndex("by_equipment_recorded", (q) => q.eq("equipmentId", args.equipmentId))
        .collect();
      const prediction = computeServicePrediction(allLogs, equipment.serviceIntervalHours, equipment.lastServiceHours);
      const fleet = await ctx.db.get(vessel.fleetId);

      if (fleet) {
        if (prediction.isOverdue) {
          await ctx.db.insert("notifications", {
            userId: fleet.ownerId,
            type: "fleet_service_overdue",
            title: "Service Overdue",
            message: `${vessel.name} — ${equipment.name} is overdue by ${Math.round(prediction.overdueByHours ?? 0)} hrs${args.serviceLabel ? ` (${args.serviceLabel})` : ""}.`,
            relatedId: args.vesselId,
            relatedType: "vessels",
            isRead: false,
            createdAt: Date.now(),
          });
        } else if (prediction.hoursUntilService !== null && prediction.hoursUntilService <= 20) {
          await ctx.db.insert("notifications", {
            userId: fleet.ownerId,
            type: "fleet_service_approaching",
            title: "Service Approaching",
            message: `${vessel.name} — ${equipment.name} is ${Math.round(prediction.hoursUntilService)} hrs from service${args.serviceLabel ? ` (${args.serviceLabel})` : ""}.`,
            relatedId: args.vesselId,
            relatedType: "vessels",
            isRead: false,
            createdAt: Date.now(),
          });
        }
      }
    }

    await logAudit(ctx, { action: "engine_hours.logged", actorId: userId, targetId: args.equipmentId as string, targetType: "vesselEquipment", after: JSON.stringify({ hours: args.hours, vesselId: args.vesselId }) });
    return { logId };
  },
});

export const getEngineHoursHistory = query({
  args: {
    equipmentId: v.id("vesselEquipment"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);
    const equipment = await ctx.db.get(args.equipmentId);
    if (!equipment) return [];

    // Access check via vessel
    const vessel = await ctx.db.get(equipment.vesselId);
    if (!vessel) return [];
    const isOwner = (user.role === "owner" || user.role === "fleet_manager") && vessel.ownerId === userId;
    const isMechanic = user.role === "mechanic";
    if (!isOwner && !isMechanic && user.role !== "admin") return [];

    const limit = clampLimit(args.limit, 20, 100);
    return ctx.db.query("engineHoursLog")
      .withIndex("by_equipment_recorded", (q) => q.eq("equipmentId", args.equipmentId))
      .order("desc")
      .take(limit);
  },
});

export const getVesselServiceStatus = query({
  args: { vesselId: v.id("vessels") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);
    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) return null;

    const isOwner = (user.role === "owner" || user.role === "fleet_manager") && vessel.ownerId === userId;
    if (!isOwner && user.role !== "admin") return null;

    const engines = await ctx.db.query("vesselEquipment")
      .withIndex("by_vessel_category", (q) => q.eq("vesselId", args.vesselId).eq("category", "propulsion"))
      .collect();

    const results = await Promise.all(engines.map(async (eq) => {
      const logs = await ctx.db.query("engineHoursLog")
        .withIndex("by_equipment_recorded", (q) => q.eq("equipmentId", eq._id))
        .collect();
      return { equipment: eq, prediction: computeServicePrediction(logs, eq.serviceIntervalHours, eq.lastServiceHours) };
    }));

    return results;
  },
});

export const getFleetServiceStatus = query({
  args: { fleetId: v.id("fleets") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);
    const fleet = await ctx.db.get(args.fleetId);
    if (!fleet) return [];
    if (user.role !== "admin" && fleet.ownerId !== userId) return [];

    const vessels = await ctx.db.query("vessels")
      .withIndex("by_fleet", (q) => q.eq("fleetId", args.fleetId))
      .collect();

    const vesselStatuses = await Promise.all(vessels.map(async (vessel) => {
      const engines = await ctx.db.query("vesselEquipment")
        .withIndex("by_vessel_category", (q) => q.eq("vesselId", vessel._id).eq("category", "propulsion"))
        .collect();

      const engineStatuses = await Promise.all(engines.map(async (eq) => {
        const logs = await ctx.db.query("engineHoursLog")
          .withIndex("by_equipment_recorded", (q) => q.eq("equipmentId", eq._id))
          .collect();
        return { equipmentId: eq._id, name: eq.name, currentHours: eq.currentHours, serviceIntervalHours: eq.serviceIntervalHours, prediction: computeServicePrediction(logs, eq.serviceIntervalHours, eq.lastServiceHours) };
      }));

      const isOverdue = engineStatuses.some((e) => e.prediction.isOverdue);
      const isApproaching = !isOverdue && engineStatuses.some((e) => e.prediction.hoursUntilService !== null && e.prediction.hoursUntilService <= 20);
      const urgencyScore = isOverdue ? 2 : isApproaching ? 1 : 0;

      return { vessel, engineStatuses, isOverdue, isApproaching, urgencyScore };
    }));

    // Sort: overdue first, then approaching, then ok
    return vesselStatuses.sort((a, b) => b.urgencyScore - a.urgencyScore);
  },
});
