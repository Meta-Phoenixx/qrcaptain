import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireFleetManager, requireVesselOwnerOrAdmin } from "./lib/auth";
import { requireMaxLength, requirePositive } from "./lib/validate";
import { logAudit } from "./lib/audit";

export const createFleet = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    fleetType: v.optional(v.union(
      v.literal("charter"),
      v.literal("fishing"),
      v.literal("racing"),
      v.literal("leisure"),
      v.literal("commercial"),
    )),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireFleetManager(ctx);
    requireMaxLength(args.name, "Fleet name", 100);
    if (args.description) requireMaxLength(args.description, "Description", 500);

    const fleetId = await ctx.db.insert("fleets", {
      ownerId: userId,
      name: args.name.trim(),
      description: args.description?.trim(),
      fleetType: args.fleetType,
      imageStorageId: args.imageStorageId,
      createdAt: Date.now(),
    });

    await logAudit(ctx, {
      action: "fleet.create",
      actorId: userId,
      targetId: fleetId as string,
      targetType: "fleets",
      after: JSON.stringify({ name: args.name, fleetType: args.fleetType }),
    });

    return { fleetId };
  },
});

export const updateFleet = mutation({
  args: {
    fleetId: v.id("fleets"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    fleetType: v.optional(v.union(
      v.literal("charter"),
      v.literal("fishing"),
      v.literal("racing"),
      v.literal("leisure"),
      v.literal("commercial"),
    )),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);
    const fleet = await ctx.db.get(args.fleetId);
    if (!fleet) throw new Error("Fleet not found");
    if (user.role !== "admin" && fleet.ownerId !== userId) throw new Error("Access denied");

    const { fleetId, ...updates } = args;
    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) { requireMaxLength(updates.name, "Fleet name", 100); patch.name = updates.name.trim(); }
    if (updates.description !== undefined) patch.description = updates.description.trim();
    if (updates.fleetType !== undefined) patch.fleetType = updates.fleetType;
    if (updates.imageStorageId !== undefined) patch.imageStorageId = updates.imageStorageId;

    await ctx.db.patch(fleetId, patch);
    await logAudit(ctx, { action: "fleet.update", actorId: userId, targetId: fleetId as string, targetType: "fleets", after: JSON.stringify(patch) });
  },
});

export const deleteFleet = mutation({
  args: { fleetId: v.id("fleets") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);
    const fleet = await ctx.db.get(args.fleetId);
    if (!fleet) throw new Error("Fleet not found");
    if (user.role !== "admin" && fleet.ownerId !== userId) throw new Error("Access denied");

    // Clear fleetId from all vessels in this fleet
    const vessels = await ctx.db.query("vessels").withIndex("by_fleet", (q) => q.eq("fleetId", args.fleetId)).collect();
    await Promise.all(vessels.map((v) => ctx.db.patch(v._id, { fleetId: undefined })));

    // Deactivate fleet mechanic authorizations
    const auths = await ctx.db.query("fleetMechanicAuthorizations").withIndex("by_fleet", (q) => q.eq("fleetId", args.fleetId)).collect();
    await Promise.all(auths.map((a) => ctx.db.patch(a._id, { isActive: false })));

    await ctx.db.delete(args.fleetId);
    await logAudit(ctx, { action: "fleet.delete", actorId: userId, targetId: args.fleetId as string, targetType: "fleets", before: JSON.stringify({ name: fleet.name }) });
  },
});

export const listMyFleets = query({
  args: {},
  handler: async (ctx) => {
    const { userId, user } = await requireAuth(ctx);
    if (user.role === "admin") {
      return ctx.db.query("fleets").collect();
    }
    return ctx.db.query("fleets").withIndex("by_owner", (q) => q.eq("ownerId", userId)).collect();
  },
});

export const getFleet = query({
  args: { fleetId: v.id("fleets") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);
    const fleet = await ctx.db.get(args.fleetId);
    if (!fleet) return null;
    if (user.role !== "admin" && fleet.ownerId !== userId) throw new Error("Access denied");

    const vessels = await ctx.db.query("vessels").withIndex("by_fleet", (q) => q.eq("fleetId", args.fleetId)).collect();
    const mechAuths = await ctx.db.query("fleetMechanicAuthorizations")
      .withIndex("by_fleet", (q) => q.eq("fleetId", args.fleetId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    const mechanics = await Promise.all(mechAuths.map((a) => ctx.db.get(a.mechanicId)));

    return {
      ...fleet,
      vessels,
      mechanics: mechanics.filter(Boolean).map((m) => ({
        _id: m!._id,
        firstName: m!.firstName,
        lastName: m!.lastName,
        companyName: m!.companyName,
        email: m!.email,
      })),
    };
  },
});

export const addVesselToFleet = mutation({
  args: {
    vesselId: v.id("vessels"),
    fleetId: v.id("fleets"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireVesselOwnerOrAdmin(ctx, args.vesselId);
    const fleet = await ctx.db.get(args.fleetId);
    if (!fleet) throw new Error("Fleet not found");
    if (fleet.ownerId !== userId) throw new Error("Vessel and fleet must belong to same owner");

    await ctx.db.patch(args.vesselId, { fleetId: args.fleetId });

    // Auto-authorize all active fleet mechanics for this vessel
    const fleetAuths = await ctx.db.query("fleetMechanicAuthorizations")
      .withIndex("by_fleet", (q) => q.eq("fleetId", args.fleetId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    for (const auth of fleetAuths) {
      const existing = await ctx.db.query("mechanicAuthorizations")
        .withIndex("by_vessel_mechanic", (q) => q.eq("vesselId", args.vesselId).eq("mechanicId", auth.mechanicId))
        .first();
      if (!existing) {
        await ctx.db.insert("mechanicAuthorizations", {
          vesselId: args.vesselId,
          mechanicId: auth.mechanicId,
          authorizedAt: Date.now(),
          authorizedBy: userId,
          isActive: true,
        });
      } else if (!existing.isActive) {
        await ctx.db.patch(existing._id, { isActive: true });
      }
    }

    await logAudit(ctx, { action: "fleet.vessel_added", actorId: userId, targetId: args.vesselId as string, targetType: "vessels", after: JSON.stringify({ fleetId: args.fleetId }) });
  },
});

export const removeVesselFromFleet = mutation({
  args: { vesselId: v.id("vessels") },
  handler: async (ctx, args) => {
    const { userId } = await requireVesselOwnerOrAdmin(ctx, args.vesselId);
    await ctx.db.patch(args.vesselId, { fleetId: undefined });
    await logAudit(ctx, { action: "fleet.vessel_removed", actorId: userId, targetId: args.vesselId as string, targetType: "vessels" });
  },
});

export const authorizeMechanicForFleet = mutation({
  args: {
    fleetId: v.id("fleets"),
    mechanicId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);
    const fleet = await ctx.db.get(args.fleetId);
    if (!fleet) throw new Error("Fleet not found");
    if (user.role !== "admin" && fleet.ownerId !== userId) throw new Error("Access denied");

    const mechanic = await ctx.db.get(args.mechanicId);
    if (!mechanic || mechanic.role !== "mechanic") throw new Error("User is not a mechanic");

    // Upsert fleet-level authorization
    const existing = await ctx.db.query("fleetMechanicAuthorizations")
      .withIndex("by_fleet_mechanic", (q) => q.eq("fleetId", args.fleetId).eq("mechanicId", args.mechanicId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { isActive: true, authorizedAt: Date.now(), authorizedBy: userId });
    } else {
      await ctx.db.insert("fleetMechanicAuthorizations", {
        fleetId: args.fleetId,
        mechanicId: args.mechanicId,
        authorizedBy: userId,
        authorizedAt: Date.now(),
        isActive: true,
      });
    }

    // Upsert per-vessel mechanic authorization for every vessel in this fleet
    const vessels = await ctx.db.query("vessels").withIndex("by_fleet", (q) => q.eq("fleetId", args.fleetId)).collect();
    for (const vessel of vessels) {
      const auth = await ctx.db.query("mechanicAuthorizations")
        .withIndex("by_vessel_mechanic", (q) => q.eq("vesselId", vessel._id).eq("mechanicId", args.mechanicId))
        .first();
      if (!auth) {
        await ctx.db.insert("mechanicAuthorizations", {
          vesselId: vessel._id,
          mechanicId: args.mechanicId,
          authorizedAt: Date.now(),
          authorizedBy: userId,
          isActive: true,
        });
      } else if (!auth.isActive) {
        await ctx.db.patch(auth._id, { isActive: true });
      }
    }

    await logAudit(ctx, { action: "fleet.mechanic_authorized", actorId: userId, targetId: args.fleetId as string, targetType: "fleets", after: JSON.stringify({ mechanicId: args.mechanicId }) });

    // Notify fleet manager
    await ctx.db.insert("notifications", {
      userId,
      type: "fleet_mechanic_authorized",
      title: "Mechanic Authorized for Fleet",
      message: `${mechanic.firstName ?? mechanic.companyName ?? "Mechanic"} now has access to all vessels in this fleet.`,
      relatedId: args.fleetId,
      relatedType: "fleets",
      isRead: false,
      createdAt: Date.now(),
    });
  },
});

export const revokeMechanicFromFleet = mutation({
  args: {
    fleetId: v.id("fleets"),
    mechanicId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);
    const fleet = await ctx.db.get(args.fleetId);
    if (!fleet) throw new Error("Fleet not found");
    if (user.role !== "admin" && fleet.ownerId !== userId) throw new Error("Access denied");

    const fleetAuth = await ctx.db.query("fleetMechanicAuthorizations")
      .withIndex("by_fleet_mechanic", (q) => q.eq("fleetId", args.fleetId).eq("mechanicId", args.mechanicId))
      .first();
    if (fleetAuth) await ctx.db.patch(fleetAuth._id, { isActive: false });

    // Deactivate per-vessel authorizations for all vessels in this fleet
    const vessels = await ctx.db.query("vessels").withIndex("by_fleet", (q) => q.eq("fleetId", args.fleetId)).collect();
    for (const vessel of vessels) {
      const auth = await ctx.db.query("mechanicAuthorizations")
        .withIndex("by_vessel_mechanic", (q) => q.eq("vesselId", vessel._id).eq("mechanicId", args.mechanicId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();
      if (auth) await ctx.db.patch(auth._id, { isActive: false });
    }

    await logAudit(ctx, { action: "fleet.mechanic_revoked", actorId: userId, targetId: args.fleetId as string, targetType: "fleets", after: JSON.stringify({ mechanicId: args.mechanicId }) });
  },
});

export const updateVesselStatus = mutation({
  args: {
    vesselId: v.id("vessels"),
    status: v.union(
      v.literal("in_service"),
      v.literal("in_maintenance"),
      v.literal("out_of_service"),
      v.literal("storage"),
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) throw new Error("Vessel not found");

    // Mechanic, owner, fleet_manager, or admin can update status
    const { user } = await requireAuth(ctx);
    const isMechanicAuthorized = user.role === "mechanic" && await ctx.db
      .query("mechanicAuthorizations")
      .withIndex("by_vessel_mechanic", (q) => q.eq("vesselId", args.vesselId).eq("mechanicId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    const isOwner = (user.role === "owner" || user.role === "fleet_manager") && vessel.ownerId === userId;
    if (!isMechanicAuthorized && !isOwner && user.role !== "admin") throw new Error("Access denied");

    const before = vessel.status;
    await ctx.db.patch(args.vesselId, { status: args.status });

    // Notify fleet manager if vessel belongs to a fleet
    if (vessel.fleetId) {
      const fleet = await ctx.db.get(vessel.fleetId);
      if (fleet) {
        await ctx.db.insert("notifications", {
          userId: fleet.ownerId,
          type: "fleet_vessel_status",
          title: "Vessel Status Updated",
          message: `${vessel.name} status changed to ${args.status.replace(/_/g, " ")}.`,
          relatedId: args.vesselId,
          relatedType: "vessels",
          isRead: false,
          createdAt: Date.now(),
        });
      }
    }

    await logAudit(ctx, { action: "vessel.status_updated", actorId: userId, targetId: args.vesselId as string, targetType: "vessels", before: JSON.stringify({ status: before }), after: JSON.stringify({ status: args.status }) });
  },
});

export const saveInsuranceInfo = mutation({
  args: {
    vesselId: v.id("vessels"),
    provider: v.string(),
    policyNumber: v.string(),
    insuredName: v.string(),
    expiryDate: v.number(),
    documentStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireVesselOwnerOrAdmin(ctx, args.vesselId);
    requireMaxLength(args.provider, "Provider", 200);
    requireMaxLength(args.policyNumber, "Policy number", 100);
    requirePositive(args.expiryDate, "Expiry date");

    const { vesselId, ...info } = args;
    await ctx.db.patch(vesselId, {
      insuranceInfo: { ...info, verifiedAt: Date.now() },
    });

    await logAudit(ctx, { action: "vessel.insurance_saved", actorId: userId, targetId: vesselId, targetType: "vessels", after: JSON.stringify({ provider: args.provider, expiryDate: args.expiryDate }) });
  },
});
