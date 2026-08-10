import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import {
  getAuthenticatedUser,
  requireRole,
  requireVesselOwnerOrAdmin,
} from "./lib/auth";
import { logAudit } from "./lib/audit";
import { Errors } from "./lib/errors";
import { getFileUrl } from "./lib/fileStorage";
import { requireMaxLength } from "./lib/validate";

function generateQRCodeData(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `QRC-${timestamp}-${random}`.toUpperCase();
}

export const listMyVessels = query({
  args: {},
  handler: async (ctx) => {
    const realUser = await getAuthenticatedUser(ctx);
    if (!realUser) return [];

    // Resolve impersonation: if admin is impersonating, operate as the target user
    let user = realUser;
    if (realUser.role === "admin" && realUser.impersonatingAs) {
      const target = await ctx.db.get(realUser.impersonatingAs);
      if (target) user = target;
    }

    const userId = user._id;
    let vessels: Doc<"vessels">[] = [];

    if (user.role === "owner") {
      vessels = await ctx.db
        .query("vessels")
        .withIndex("by_owner", (q) => q.eq("ownerId", userId))
        .collect();
    } else if (user.role === "mechanic") {
      const authorizations = await ctx.db
        .query("mechanicAuthorizations")
        .withIndex("by_mechanic", (q) => q.eq("mechanicId", userId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      const vesselResults = await Promise.all(
        authorizations.map((auth) => ctx.db.get(auth.vesselId))
      );
      vessels = vesselResults.filter(Boolean) as Doc<"vessels">[];
    } else if (user.role === "admin") {
      vessels = await ctx.db.query("vessels").collect();
    }

    return Promise.all(
      vessels.map(async (vessel) => {
        const workOrders = await ctx.db
          .query("workOrders")
          .withIndex("by_vessel", (q) => q.eq("vesselId", vessel._id))
          .collect();

        const activeWorkOrders = workOrders.filter(
          (wo) => wo.status === "in_progress"
        );

        let activeWorkOrderInfo = null;
        if (activeWorkOrders.length > 0) {
          const latest = activeWorkOrders[0];
          const mechanic = await ctx.db.get(latest.mechanicId);
          activeWorkOrderInfo = {
            _id: latest._id,
            description: latest.description,
            startedAt: latest.startedAt,
            mechanicName:
              mechanic?.firstName && mechanic?.lastName
                ? `${mechanic.firstName} ${mechanic.lastName}`
                : mechanic?.name ?? "Unknown",
            mechanicCompany: mechanic?.companyName,
          };
        }

        return {
          ...vessel,
          imageUrl: await getFileUrl(ctx, vessel.imageStorageId),
          activeWorkOrderCount: activeWorkOrders.length,
          activeWorkOrder: activeWorkOrderInfo,
          totalWorkOrders: workOrders.length,
          completedWorkOrders: workOrders.filter(
            (wo) => wo.status === "completed"
          ).length,
        };
      })
    );
  },
});

export const getVessel = query({
  args: { vesselId: v.id("vessels") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return null;

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) return null;

    if (user.role === "owner" && vessel.ownerId !== user._id) return null;

    if (user.role === "mechanic") {
      // Check vessel-level authorization
      const vesselAuth = await ctx.db
        .query("mechanicAuthorizations")
        .withIndex("by_vessel_mechanic", (q) =>
          q.eq("vesselId", args.vesselId).eq("mechanicId", user._id)
        )
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();
      if (!vesselAuth) {
        // Check fleet-level authorization
        const fleetId = vessel.fleetId;
        if (!fleetId) return null;
        const fleetAuth = await ctx.db
          .query("fleetMechanicAuthorizations")
          .withIndex("by_fleet_mechanic", (q) => q.eq("fleetId", fleetId).eq("mechanicId", user._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .first();
        if (!fleetAuth) return null;
      }
    }

    const owner = await ctx.db.get(vessel.ownerId);

    return {
      ...vessel,
      ownerName:
        owner?.firstName && owner?.lastName
          ? `${owner.firstName} ${owner.lastName}`
          : owner?.name,
      ownerEmail: owner?.email,
    };
  },
});

// Returns which required fields are still missing on a vessel profile.
// "Required" for our purposes: hull ID (HIN), registration number, a photo,
// and at least one propulsion equipment item.
export const getVesselCompleteness = query({
  args: { vesselId: v.id("vessels") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return null;

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) return null;

    const propulsionItems = await ctx.db
      .query("vesselEquipment")
      .withIndex("by_vessel_category", (q) =>
        q.eq("vesselId", args.vesselId).eq("category", "propulsion")
      )
      .first();

    const missing: string[] = [];
    if (!vessel.hullId) missing.push("Hull ID / HIN");
    if (!vessel.registrationNumber) missing.push("Registration Number");
    if (!vessel.imageStorageId) missing.push("Vessel Photo");
    if (!propulsionItems) missing.push("Engine / Propulsion Equipment");

    return { isComplete: missing.length === 0, missing };
  },
});

export const getAuthorizedVessels = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user || user.role !== "mechanic") return [];

    const userId = user._id;

    const authorizations = await ctx.db
      .query("mechanicAuthorizations")
      .withIndex("by_mechanic", (q) => q.eq("mechanicId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const results = await Promise.all(
      authorizations.map(async (auth) => {
        const vessel = await ctx.db.get(auth.vesselId);
        if (!vessel) return null;

        const owner = await ctx.db.get(vessel.ownerId);

        const workOrders = await ctx.db
          .query("workOrders")
          .withIndex("by_vessel", (q) => q.eq("vesselId", vessel._id))
          .filter((q) => q.eq(q.field("mechanicId"), userId))
          .collect();

        return {
          _id: vessel._id,
          name: vessel.name,
          make: vessel.make,
          model: vessel.model,
          year: vessel.year,
          vesselType: vessel.vesselType,
          qrCodeData: vessel.qrCodeData,
          imageUrl: await getFileUrl(ctx, vessel.imageStorageId),
          owner: owner
            ? {
                _id: owner._id,
                name:
                  owner.firstName && owner.lastName
                    ? `${owner.firstName} ${owner.lastName}`
                    : owner.name ?? "Unknown",
                email: owner.email,
                phone: owner.phone,
                profilePhotoUrl: await getFileUrl(ctx, owner.profilePhotoStorageId),
              }
            : null,
          authorization: { authorizedAt: auth.authorizedAt },
          stats: {
            activeWorkOrders: workOrders.filter(
              (wo) => wo.status === "in_progress"
            ).length,
            completedWorkOrders: workOrders.filter(
              (wo) => wo.status === "completed"
            ).length,
            totalWorkOrders: workOrders.length,
          },
        };
      })
    );

    return results.filter(Boolean);
  },
});

export const getVesselByQRCode = query({
  args: { qrCodeData: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return null;

    const vessel = await ctx.db
      .query("vessels")
      .withIndex("by_qr_code", (q) => q.eq("qrCodeData", args.qrCodeData))
      .first();

    if (!vessel) return null;

    const owner = await ctx.db.get(vessel.ownerId);
    const workOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_vessel", (q) => q.eq("vesselId", vessel._id))
      .collect();

    return {
      ...vessel,
      ownerName:
        owner?.firstName && owner?.lastName
          ? `${owner.firstName} ${owner.lastName}`
          : owner?.name,
      ownerEmail: owner?.email,
      workOrderCount: workOrders.length,
    };
  },
});

export const createVessel = mutation({
  args: {
    name: v.string(),
    registrationNumber: v.optional(v.string()),
    hullId: v.optional(v.string()),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    vesselType: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, "owner");

    requireMaxLength(args.name, "Vessel name", 200);
    requireMaxLength(args.make, "Make", 100);
    requireMaxLength(args.model, "Model", 100);
    requireMaxLength(args.vesselType, "Vessel type", 100);
    if (args.registrationNumber !== undefined) requireMaxLength(args.registrationNumber, "Registration number", 100);
    if (args.hullId !== undefined) requireMaxLength(args.hullId, "Hull ID", 100);
    if (args.notes !== undefined) requireMaxLength(args.notes, "Notes", 2000);

    const qrCodeData = generateQRCodeData();

    const vesselId = await ctx.db.insert("vessels", {
      ownerId: userId,
      ...args,
      qrCodeData,
    });

    await logAudit(ctx, {
      action: "vessel.created",
      actorId: userId,
      targetId: vesselId,
      targetType: "vessels",
      after: { name: args.name, make: args.make, model: args.model, year: args.year },
    });

    return { vesselId, qrCodeData };
  },
});

export const updateVessel = mutation({
  args: {
    vesselId: v.id("vessels"),
    name: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    hullId: v.optional(v.string()),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
    vesselType: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, vessel } = await requireVesselOwnerOrAdmin(ctx, args.vesselId);

    if (args.name !== undefined) requireMaxLength(args.name, "Vessel name", 200);
    if (args.make !== undefined) requireMaxLength(args.make, "Make", 100);
    if (args.model !== undefined) requireMaxLength(args.model, "Model", 100);
    if (args.vesselType !== undefined) requireMaxLength(args.vesselType, "Vessel type", 100);
    if (args.hullId !== undefined) requireMaxLength(args.hullId, "Hull ID", 100);
    if (args.notes !== undefined) requireMaxLength(args.notes, "Notes", 2000);

    const { vesselId, ...fields } = args;
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(vesselId, updates);

    await logAudit(ctx, {
      action: "vessel.updated",
      actorId: userId,
      targetId: vesselId,
      targetType: "vessels",
      before: { name: vessel.name, make: vessel.make, model: vessel.model },
      after: updates,
    });

    return { success: true };
  },
});

export const deleteVessel = mutation({
  args: { vesselId: v.id("vessels") },
  handler: async (ctx, args) => {
    const { userId, vessel } = await requireVesselOwnerOrAdmin(ctx, args.vesselId);

    await ctx.db.delete(args.vesselId);

    await logAudit(ctx, {
      action: "vessel.deleted",
      actorId: userId,
      targetId: args.vesselId,
      targetType: "vessels",
      before: { name: vessel.name, make: vessel.make, model: vessel.model },
    });

    return { success: true };
  },
});

export const authorizeMechanic = mutation({
  args: {
    vesselId: v.id("vessels"),
    mechanicId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireVesselOwnerOrAdmin(ctx, args.vesselId);

    const mechanic = await ctx.db.get(args.mechanicId);
    if (!mechanic || mechanic.role !== "mechanic") {
      throw Errors.validation("Invalid mechanic");
    }

    const existing = await ctx.db
      .query("mechanicAuthorizations")
      .withIndex("by_vessel_mechanic", (q) =>
        q.eq("vesselId", args.vesselId).eq("mechanicId", args.mechanicId)
      )
      .first();

    let authorizationId;
    if (existing) {
      await ctx.db.patch(existing._id, { isActive: true });
      authorizationId = existing._id;
    } else {
      authorizationId = await ctx.db.insert("mechanicAuthorizations", {
        vesselId: args.vesselId,
        mechanicId: args.mechanicId,
        authorizedAt: Date.now(),
        authorizedBy: userId,
        isActive: true,
      });
    }

    await logAudit(ctx, {
      action: "vessel.mechanic_authorized",
      actorId: userId,
      targetId: args.vesselId,
      targetType: "vessels",
      metadata: { mechanicId: args.mechanicId },
    });

    return { authorizationId };
  },
});

export const revokeMechanicAuthorization = mutation({
  args: {
    vesselId: v.id("vessels"),
    mechanicId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireVesselOwnerOrAdmin(ctx, args.vesselId);

    const auth = await ctx.db
      .query("mechanicAuthorizations")
      .withIndex("by_vessel_mechanic", (q) =>
        q.eq("vesselId", args.vesselId).eq("mechanicId", args.mechanicId)
      )
      .first();

    if (auth) {
      await ctx.db.patch(auth._id, { isActive: false });
    }

    await logAudit(ctx, {
      action: "vessel.mechanic_authorization_revoked",
      actorId: userId,
      targetId: args.vesselId,
      targetType: "vessels",
      metadata: { mechanicId: args.mechanicId },
    });

    return { success: true };
  },
});

export const getAdminStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user || user.role !== "admin") return null;

    const [users, vessels, workOrders] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("vessels").collect(),
      ctx.db.query("workOrders").collect(),
    ]);

    return {
      userCount: users.length,
      vesselCount: vessels.length,
      workOrderCount: workOrders.length,
      ownerCount: users.filter((u) => u.role === "owner").length,
      mechanicCount: users.filter((u) => u.role === "mechanic").length,
      activeWorkOrders: workOrders.filter((wo) => wo.status === "in_progress")
        .length,
      completedWorkOrders: workOrders.filter((wo) => wo.status === "completed")
        .length,
    };
  },
});
