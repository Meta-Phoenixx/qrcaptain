import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireFleetManager } from "./lib/auth";
import { requireMaxLength, clampLimit } from "./lib/validate";
import { logAudit } from "./lib/audit";

export const assignCaptain = mutation({
  args: {
    vesselId: v.id("vessels"),
    captainId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireFleetManager(ctx);

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) throw new Error("Vessel not found");
    if (user.role !== "admin" && vessel.ownerId !== userId) throw new Error("Access denied");

    const captain = await ctx.db.get(args.captainId);
    if (!captain || captain.role !== "captain") throw new Error("User is not a captain");

    const existing = await ctx.db.query("captainAssignments")
      .withIndex("by_vessel_captain", (q) => q.eq("vesselId", args.vesselId).eq("captainId", args.captainId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { isActive: true, assignedAt: Date.now(), assignedBy: userId });
    } else {
      await ctx.db.insert("captainAssignments", {
        vesselId: args.vesselId,
        captainId: args.captainId,
        assignedBy: userId,
        assignedAt: Date.now(),
        isActive: true,
      });
    }

    await logAudit(ctx, { action: "captain.assigned", actorId: userId, targetId: args.vesselId as string, targetType: "vessels", after: JSON.stringify({ captainId: args.captainId }) });
  },
});

export const removeCaptain = mutation({
  args: {
    vesselId: v.id("vessels"),
    captainId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireFleetManager(ctx);
    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) throw new Error("Vessel not found");
    if (user.role !== "admin" && vessel.ownerId !== userId) throw new Error("Access denied");

    const assignment = await ctx.db.query("captainAssignments")
      .withIndex("by_vessel_captain", (q) => q.eq("vesselId", args.vesselId).eq("captainId", args.captainId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    if (assignment) await ctx.db.patch(assignment._id, { isActive: false });

    await logAudit(ctx, { action: "captain.removed", actorId: userId, targetId: args.vesselId as string, targetType: "vessels", after: JSON.stringify({ captainId: args.captainId }) });
  },
});

export const listCaptainsForVessel = query({
  args: { vesselId: v.id("vessels") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);
    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) return [];
    const isOwner = (user.role === "owner" || user.role === "fleet_manager") && vessel.ownerId === userId;
    if (!isOwner && user.role !== "admin") return [];

    const assignments = await ctx.db.query("captainAssignments")
      .withIndex("by_vessel", (q) => q.eq("vesselId", args.vesselId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const captains = await Promise.all(assignments.map((a) => ctx.db.get(a.captainId)));
    return captains.filter(Boolean).map((c) => ({
      _id: c!._id,
      firstName: c!.firstName,
      lastName: c!.lastName,
      email: c!.email,
    }));
  },
});

export const filePostTripReport = mutation({
  args: {
    vesselId: v.id("vessels"),
    message: v.string(),
    gpsLat: v.optional(v.number()),
    gpsLng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);
    if (user.role !== "captain") throw new Error("Only captains can file trip reports");

    requireMaxLength(args.message, "Report message", 1000);

    // Verify this captain is assigned to this vessel
    const assignment = await ctx.db.query("captainAssignments")
      .withIndex("by_vessel_captain", (q) => q.eq("vesselId", args.vesselId).eq("captainId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    if (!assignment) throw new Error("You are not assigned to this vessel");

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) throw new Error("Vessel not found");

    const reportId = await ctx.db.insert("captainTripReports", {
      vesselId: args.vesselId,
      captainId: userId,
      reportType: "post_trip",
      message: args.message.trim(),
      gpsLat: args.gpsLat,
      gpsLng: args.gpsLng,
      isResolved: false,
      createdAt: Date.now(),
    });

    // Notify the fleet manager (if vessel belongs to a fleet)
    if (vessel.fleetId) {
      const fleet = await ctx.db.get(vessel.fleetId);
      if (fleet) {
        await ctx.db.insert("notifications", {
          userId: fleet.ownerId,
          type: "fleet_captain_report",
          title: "Captain Post-Trip Note",
          message: `${vessel.name}: ${args.message.slice(0, 120)}${args.message.length > 120 ? "…" : ""}`,
          relatedId: reportId,
          relatedType: "captainTripReports",
          isRead: false,
          createdAt: Date.now(),
        });
      }
    }

    // Notify all authorized mechanics for this vessel
    const mechAuths = await ctx.db.query("mechanicAuthorizations")
      .withIndex("by_vessel", (q) => q.eq("vesselId", args.vesselId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    await Promise.all(mechAuths.map((auth) =>
      ctx.db.insert("notifications", {
        userId: auth.mechanicId,
        type: "fleet_captain_report",
        title: "Captain Trip Note — Action May Be Needed",
        message: `${vessel.name}: ${args.message.slice(0, 120)}${args.message.length > 120 ? "…" : ""}`,
        relatedId: reportId,
        relatedType: "captainTripReports",
        isRead: false,
        createdAt: Date.now(),
      })
    ));

    return { reportId };
  },
});

export const sendDistressNotice = mutation({
  args: {
    vesselId: v.id("vessels"),
    message: v.string(),
    gpsLat: v.optional(v.number()),
    gpsLng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);
    if (user.role !== "captain") throw new Error("Only captains can send distress notices");

    requireMaxLength(args.message, "Distress message", 500);

    const assignment = await ctx.db.query("captainAssignments")
      .withIndex("by_vessel_captain", (q) => q.eq("vesselId", args.vesselId).eq("captainId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    if (!assignment) throw new Error("You are not assigned to this vessel");

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) throw new Error("Vessel not found");

    const reportId = await ctx.db.insert("captainTripReports", {
      vesselId: args.vesselId,
      captainId: userId,
      reportType: "distress",
      message: args.message.trim(),
      gpsLat: args.gpsLat,
      gpsLng: args.gpsLng,
      isResolved: false,
      createdAt: Date.now(),
    });

    const gpsInfo = args.gpsLat && args.gpsLng ? ` GPS: ${args.gpsLat.toFixed(4)}, ${args.gpsLng.toFixed(4)}` : "";
    const captainName = user.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "Captain";
    const notifMessage = `URGENT — ${vessel.name} (${captainName}): ${args.message}${gpsInfo}`;

    // Notify fleet manager
    if (vessel.fleetId) {
      const fleet = await ctx.db.get(vessel.fleetId);
      if (fleet) {
        await ctx.db.insert("notifications", {
          userId: fleet.ownerId,
          type: "fleet_distress_notice",
          title: `🚨 Distress Notice — ${vessel.name}`,
          message: notifMessage,
          relatedId: reportId,
          relatedType: "captainTripReports",
          isRead: false,
          createdAt: Date.now(),
        });
      }
    }

    // Notify all authorized mechanics
    const mechAuths = await ctx.db.query("mechanicAuthorizations")
      .withIndex("by_vessel", (q) => q.eq("vesselId", args.vesselId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    await Promise.all(mechAuths.map((auth) =>
      ctx.db.insert("notifications", {
        userId: auth.mechanicId,
        type: "fleet_distress_notice",
        title: `🚨 Distress Notice — ${vessel.name}`,
        message: notifMessage,
        relatedId: reportId,
        relatedType: "captainTripReports",
        isRead: false,
        createdAt: Date.now(),
      })
    ));

    await logAudit(ctx, { action: "captain.distress_sent", actorId: userId, targetId: args.vesselId as string, targetType: "vessels", after: JSON.stringify({ message: args.message, gpsLat: args.gpsLat, gpsLng: args.gpsLng }) });
    return { reportId };
  },
});

export const resolveTripReport = mutation({
  args: { reportId: v.id("captainTripReports") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");

    // Mechanic or fleet manager for this vessel can resolve
    if (user.role !== "admin") {
      const vessel = await ctx.db.get(report.vesselId);
      const isMechanic = user.role === "mechanic" && await ctx.db.query("mechanicAuthorizations")
        .withIndex("by_vessel_mechanic", (q) => q.eq("vesselId", report.vesselId).eq("mechanicId", userId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();
      const isOwner = vessel && (user.role === "owner" || user.role === "fleet_manager") && vessel.ownerId === userId;
      if (!isMechanic && !isOwner) throw new Error("Access denied");
    }

    await ctx.db.patch(args.reportId, { isResolved: true, resolvedAt: Date.now(), resolvedBy: userId });
    await logAudit(ctx, { action: "captain_report.resolved", actorId: userId, targetId: args.reportId as string, targetType: "captainTripReports" });
  },
});

export const listMyAssignments = query({
  args: {},
  handler: async (ctx) => {
    const { userId, user } = await requireAuth(ctx);
    if (user.role !== "captain") return [];

    const assignments = await ctx.db.query("captainAssignments")
      .withIndex("by_captain", (q) => q.eq("captainId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const vessels = await Promise.all(assignments.map((a) => ctx.db.get(a.vesselId)));
    return vessels
      .filter(Boolean)
      .map((v) => ({ vesselId: v!._id, vesselName: v!.name }));
  },
});

export const listTripReports = query({
  args: {
    vesselId: v.id("vessels"),
    includeResolved: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);
    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) return [];

    const isOwner = (user.role === "owner" || user.role === "fleet_manager") && vessel.ownerId === userId;
    const isMechanic = user.role === "mechanic";
    const isCaptain = user.role === "captain";
    if (!isOwner && !isMechanic && !isCaptain && user.role !== "admin") return [];

    const limit = clampLimit(args.limit, 20, 100);

    if (args.includeResolved) {
      return ctx.db.query("captainTripReports").withIndex("by_vessel", (q) => q.eq("vesselId", args.vesselId)).order("desc").take(limit);
    }
    return ctx.db.query("captainTripReports")
      .withIndex("by_vessel_unresolved", (q) => q.eq("vesselId", args.vesselId).eq("isResolved", false))
      .order("desc")
      .take(limit);
  },
});

export const getFleetTripReports = query({
  args: {
    fleetId: v.id("fleets"),
    includeResolved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);
    const fleet = await ctx.db.get(args.fleetId);
    if (!fleet) return [];
    if (user.role !== "admin" && fleet.ownerId !== userId) return [];

    const vessels = await ctx.db.query("vessels").withIndex("by_fleet", (q) => q.eq("fleetId", args.fleetId)).collect();
    const reports = await Promise.all(vessels.map(async (vessel) => {
      const vReports = args.includeResolved
        ? await ctx.db.query("captainTripReports").withIndex("by_vessel", (q) => q.eq("vesselId", vessel._id)).order("desc").take(50)
        : await ctx.db.query("captainTripReports").withIndex("by_vessel_unresolved", (q) => q.eq("vesselId", vessel._id).eq("isResolved", false)).order("desc").take(50);
      return vReports.map((r) => ({ ...r, vesselName: vessel.name }));
    }));

    return reports.flat().sort((a, b) => b.createdAt - a.createdAt);
  },
});
