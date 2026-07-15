import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthenticatedUser, requireRole, requireAuth } from "./lib/auth";
import { logAudit } from "./lib/audit";
import { Errors } from "./lib/errors";
import { getFileUrl } from "./lib/fileStorage";
import { notify, accessRequestNotification, accessApproved, accessDenied } from "./lib/notify";

export const requestAccess = mutation({
  args: {
    vesselId: v.id("vessels"),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireRole(ctx, "mechanic");

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) throw Errors.notFound("Vessel");

    const existingAuth = await ctx.db
      .query("mechanicAuthorizations")
      .withIndex("by_vessel_mechanic", (q) =>
        q.eq("vesselId", args.vesselId).eq("mechanicId", userId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (existingAuth) {
      return { status: "already_authorized", message: "You already have access to this vessel" };
    }

    const existingRequest = await ctx.db
      .query("accessRequests")
      .withIndex("by_vessel_mechanic", (q) =>
        q.eq("vesselId", args.vesselId).eq("mechanicId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingRequest) {
      return {
        status: "pending",
        requestId: existingRequest._id,
        message: "You already have a pending request for this vessel",
      };
    }

    const requestId = await ctx.db.insert("accessRequests", {
      vesselId: args.vesselId,
      mechanicId: userId,
      ownerId: vessel.ownerId,
      status: "pending",
      requestMessage: args.message,
      requestedAt: Date.now(),
    });

    await accessRequestNotification(ctx, {
      ownerId: vessel.ownerId,
      mechanicName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name || "A mechanic",
      vesselName: vessel.name,
      requestId,
    });

    await logAudit(ctx, {
      action: "access_request.created",
      actorId: userId,
      targetId: requestId,
      targetType: "accessRequests",
      metadata: { vesselId: args.vesselId, ownerId: vessel.ownerId },
    });

    return { status: "requested", requestId, message: "Access request sent to the vessel owner" };
  },
});

export const respondToRequest = mutation({
  args: {
    requestId: v.id("accessRequests"),
    approved: v.boolean(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);

    const request = await ctx.db.get(args.requestId);
    if (!request) throw Errors.notFound("Request");
    if (request.ownerId !== userId) throw Errors.accessDenied();
    if (request.status !== "pending") {
      throw Errors.validation("This request has already been processed");
    }

    const vessel = await ctx.db.get(request.vesselId);

    await ctx.db.patch(args.requestId, {
      status: args.approved ? "approved" : "denied",
      responseMessage: args.message,
      respondedAt: Date.now(),
    });

    if (args.approved) {
      const existingAuth = await ctx.db
        .query("mechanicAuthorizations")
        .withIndex("by_vessel_mechanic", (q) =>
          q.eq("vesselId", request.vesselId).eq("mechanicId", request.mechanicId)
        )
        .first();

      if (existingAuth) {
        await ctx.db.patch(existingAuth._id, {
          isActive: true,
          authorizedAt: Date.now(),
          authorizedBy: userId,
        });
      } else {
        await ctx.db.insert("mechanicAuthorizations", {
          vesselId: request.vesselId,
          mechanicId: request.mechanicId,
          authorizedAt: Date.now(),
          authorizedBy: userId,
          isActive: true,
        });
      }

      await accessApproved(ctx, {
        mechanicId: request.mechanicId,
        ownerName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "The owner",
        vesselName: vessel?.name || "the vessel",
        requestId: args.requestId,
      });

      await logAudit(ctx, {
        action: "access_request.approved",
        actorId: userId,
        targetId: args.requestId,
        targetType: "accessRequests",
        metadata: { mechanicId: request.mechanicId, vesselId: request.vesselId },
      });
    } else {
      await accessDenied(ctx, {
        mechanicId: request.mechanicId,
        ownerName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "The owner",
        vesselName: vessel?.name || "the vessel",
        requestId: args.requestId,
      });

      await logAudit(ctx, {
        action: "access_request.denied",
        actorId: userId,
        targetId: args.requestId,
        targetType: "accessRequests",
        metadata: { mechanicId: request.mechanicId, vesselId: request.vesselId },
      });
    }

    return { success: true };
  },
});

export const getPendingRequestsForOwner = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user || user.role !== "owner") return [];

    const requests = await ctx.db
      .query("accessRequests")
      .withIndex("by_owner_status", (q) =>
        q.eq("ownerId", user._id).eq("status", "pending")
      )
      .collect();

    return Promise.all(
      requests.map(async (request) => {
        const vessel = await ctx.db.get(request.vesselId);
        const mechanic = await ctx.db.get(request.mechanicId);
        return {
          ...request,
          vessel: vessel
            ? { _id: vessel._id, name: vessel.name, make: vessel.make, model: vessel.model, year: vessel.year }
            : null,
          mechanic: mechanic
            ? {
                _id: mechanic._id,
                name:
                  mechanic.firstName && mechanic.lastName
                    ? `${mechanic.firstName} ${mechanic.lastName}`
                    : mechanic.name,
                email: mechanic.email,
                companyName: mechanic.companyName,
                licenseNumber: mechanic.licenseNumber,
              }
            : null,
        };
      })
    );
  },
});

export const getMyRequestStatus = query({
  args: { vesselId: v.id("vessels") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user || user.role !== "mechanic") return null;

    const existingAuth = await ctx.db
      .query("mechanicAuthorizations")
      .withIndex("by_vessel_mechanic", (q) =>
        q.eq("vesselId", args.vesselId).eq("mechanicId", user._id)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (existingAuth) {
      return { status: "authorized", authorizedAt: existingAuth.authorizedAt };
    }

    const request = await ctx.db
      .query("accessRequests")
      .withIndex("by_vessel_mechanic", (q) =>
        q.eq("vesselId", args.vesselId).eq("mechanicId", user._id)
      )
      .order("desc")
      .first();

    if (request) {
      return {
        status: request.status,
        requestId: request._id,
        requestedAt: request.requestedAt,
        respondedAt: request.respondedAt,
        responseMessage: request.responseMessage,
      };
    }

    return { status: "none" };
  },
});

export const getMyRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user || user.role !== "mechanic") return [];

    const requests = await ctx.db
      .query("accessRequests")
      .withIndex("by_mechanic", (q) => q.eq("mechanicId", user._id))
      .order("desc")
      .collect();

    return Promise.all(
      requests.map(async (request) => {
        const vessel = await ctx.db.get(request.vesselId);
        return {
          ...request,
          vessel: vessel
            ? { _id: vessel._id, name: vessel.name, make: vessel.make, model: vessel.model, year: vessel.year }
            : null,
        };
      })
    );
  },
});

export const getMechanicsForOwner = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user || user.role !== "owner") return [];

    const vessels = await ctx.db
      .query("vessels")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    if (vessels.length === 0) return [];

    const allAuthorizations: {
      _id: Id<"mechanicAuthorizations">;
      vesselId: Id<"vessels">;
      mechanicId: Id<"users">;
      isActive: boolean;
      authorizedAt: number;
    }[] = [];

    for (const vessel of vessels) {
      const auths = await ctx.db
        .query("mechanicAuthorizations")
        .withIndex("by_vessel", (q) => q.eq("vesselId", vessel._id))
        .collect();
      allAuthorizations.push(...auths);
    }

    const allWorkOrders: {
      _id: Id<"workOrders">;
      vesselId: Id<"vessels">;
      mechanicId: Id<"users">;
      status: string;
      completedAt?: number;
    }[] = [];

    for (const vessel of vessels) {
      const orders = await ctx.db
        .query("workOrders")
        .withIndex("by_vessel", (q) => q.eq("vesselId", vessel._id))
        .collect();
      allWorkOrders.push(...orders);
    }

    const mechanicMap = new Map<
      string,
      {
        mechanicId: Id<"users">;
        vessels: {
          vesselId: string;
          vesselName: string;
          isActive: boolean;
          authorizationId: string | null;
          authorizedAt: number | null;
        }[];
        workOrderCount: number;
        completedOrderCount: number;
        lastWorkDate: number | null;
      }
    >();

    for (const auth of allAuthorizations) {
      const vessel = vessels.find((v) => v._id === auth.vesselId);
      if (!vessel) continue;

      const key = auth.mechanicId.toString();
      if (!mechanicMap.has(key)) {
        mechanicMap.set(key, {
          mechanicId: auth.mechanicId,
          vessels: [],
          workOrderCount: 0,
          completedOrderCount: 0,
          lastWorkDate: null,
        });
      }

      const mechData = mechanicMap.get(key)!;
      const existingVessel = mechData.vessels.find(
        (v) => v.vesselId === auth.vesselId.toString()
      );
      if (!existingVessel) {
        mechData.vessels.push({
          vesselId: auth.vesselId.toString(),
          vesselName: vessel.name,
          isActive: auth.isActive,
          authorizationId: auth._id.toString(),
          authorizedAt: auth.authorizedAt,
        });
      } else {
        existingVessel.isActive = auth.isActive;
        existingVessel.authorizationId = auth._id.toString();
        existingVessel.authorizedAt = auth.authorizedAt;
      }
    }

    for (const order of allWorkOrders) {
      const key = order.mechanicId.toString();
      const vessel = vessels.find((v) => v._id === order.vesselId);

      if (!mechanicMap.has(key)) {
        mechanicMap.set(key, {
          mechanicId: order.mechanicId,
          vessels: [],
          workOrderCount: 0,
          completedOrderCount: 0,
          lastWorkDate: null,
        });
      }

      const mechData = mechanicMap.get(key)!;
      mechData.workOrderCount++;

      if (order.status === "completed") {
        mechData.completedOrderCount++;
        if (
          order.completedAt &&
          (!mechData.lastWorkDate || order.completedAt > mechData.lastWorkDate)
        ) {
          mechData.lastWorkDate = order.completedAt;
        }
      }

      if (vessel) {
        const existingVessel = mechData.vessels.find(
          (v) => v.vesselId === order.vesselId.toString()
        );
        if (!existingVessel) {
          mechData.vessels.push({
            vesselId: order.vesselId.toString(),
            vesselName: vessel.name,
            isActive: false,
            authorizationId: null,
            authorizedAt: null,
          });
        }
      }
    }

    const result = await Promise.all(
      Array.from(mechanicMap.values()).map(async (mechData) => {
        const mechanic = await ctx.db.get(mechData.mechanicId);
        if (!mechanic) return null;

        const profilePhotoUrl = await getFileUrl(ctx, mechanic.profilePhotoStorageId);

        return {
          _id: mechanic._id,
          name:
            mechanic.firstName && mechanic.lastName
              ? `${mechanic.firstName} ${mechanic.lastName}`
              : mechanic.name || "Unknown",
          email: mechanic.email,
          companyName: mechanic.companyName,
          phone: mechanic.phone,
          profilePhotoUrl,
          vessels: mechData.vessels,
          workOrderCount: mechData.workOrderCount,
          completedOrderCount: mechData.completedOrderCount,
          lastWorkDate: mechData.lastWorkDate,
          hasActiveAccess: mechData.vessels.some((v) => v.isActive),
        };
      })
    );

    return result
      .filter(Boolean)
      .sort((a, b) => {
        if (a!.hasActiveAccess !== b!.hasActiveAccess) {
          return a!.hasActiveAccess ? -1 : 1;
        }
        return (b!.lastWorkDate || 0) - (a!.lastWorkDate || 0);
      });
  },
});

export const toggleMechanicAccess = mutation({
  args: {
    mechanicId: v.id("users"),
    vesselId: v.id("vessels"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireRole(ctx, "owner");

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel || vessel.ownerId !== userId) {
      throw Errors.notFound("Vessel");
    }

    const auth = await ctx.db
      .query("mechanicAuthorizations")
      .withIndex("by_vessel_mechanic", (q) =>
        q.eq("vesselId", args.vesselId).eq("mechanicId", args.mechanicId)
      )
      .first();

    if (auth) {
      await ctx.db.patch(auth._id, { isActive: args.isActive });
    } else if (args.isActive) {
      await ctx.db.insert("mechanicAuthorizations", {
        vesselId: args.vesselId,
        mechanicId: args.mechanicId,
        authorizedAt: Date.now(),
        authorizedBy: userId,
        isActive: true,
      });
    }

    await notify(ctx, {
      userId: args.mechanicId,
      type: args.isActive ? "access_approved" : "access_revoked",
      title: args.isActive ? "Access Restored" : "Access Revoked",
      message: args.isActive
        ? `${user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "The owner"} has restored your access to ${vessel.name}`
        : `${user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "The owner"} has revoked your access to ${vessel.name}`,
      relatedId: args.vesselId,
      relatedType: "vessel",
    });

    return { success: true };
  },
});

export const revokeAllMechanicAccess = mutation({
  args: { mechanicId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireRole(ctx, "owner");

    const vessels = await ctx.db
      .query("vessels")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    for (const vessel of vessels) {
      const auth = await ctx.db
        .query("mechanicAuthorizations")
        .withIndex("by_vessel_mechanic", (q) =>
          q.eq("vesselId", vessel._id).eq("mechanicId", args.mechanicId)
        )
        .first();

      if (auth && auth.isActive) {
        await ctx.db.patch(auth._id, { isActive: false });
      }
    }

    await notify(ctx, {
      userId: args.mechanicId,
      type: "access_revoked",
      title: "Access Revoked",
      message: `${user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "The owner"} has revoked your access to all their vessels`,
      relatedId: userId,
      relatedType: "user",
    });

    return { success: true };
  },
});
