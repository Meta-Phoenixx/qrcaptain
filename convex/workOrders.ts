import { v } from "convex/values";
import { query, mutation, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  getAuthenticatedUser,
  requireRole,
  requireAuth,
} from "./lib/auth";
import { logAudit } from "./lib/audit";
import { Errors } from "./lib/errors";
import {
  workOrderStarted,
  workOrderRequested,
  quoteSubmitted,
  quoteAccepted,
  quoteDeclined,
  requestDeclined,
  workOrderCompleted,
  workOrderCancelled,
  rateMechanicReminder,
  rateOwnerReminder,
  notify,
} from "./lib/notify";
import { getFileUrl } from "./lib/fileStorage";
import { requireMaxLength, requirePositive, requireNonNegative, requireRange } from "./lib/validate";

async function getSettingValue(
  ctx: MutationCtx,
  key: string,
  defaultValue: number
): Promise<number> {
  const setting = await ctx.db
    .query("appSettings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  if (setting) {
    try {
      return JSON.parse(setting.value);
    } catch {
      return defaultValue;
    }
  }
  return defaultValue;
}

export const getVesselWorkOrders = query({
  args: { vesselId: v.id("vessels") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) return [];

    if (user.role === "owner" && vessel.ownerId !== user._id) return [];

    if (user.role === "mechanic") {
      const vesselAuth = await ctx.db
        .query("mechanicAuthorizations")
        .withIndex("by_vessel_mechanic", (q) =>
          q.eq("vesselId", args.vesselId).eq("mechanicId", user._id)
        )
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();
      if (!vesselAuth) {
        const fleetId = vessel.fleetId;
        if (!fleetId) return [];
        const fleetAuth = await ctx.db
          .query("fleetMechanicAuthorizations")
          .withIndex("by_fleet_mechanic", (q) => q.eq("fleetId", fleetId).eq("mechanicId", user._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .first();
        if (!fleetAuth) return [];
      }
    }

    const workOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_vessel", (q) => q.eq("vesselId", args.vesselId))
      .order("desc")
      .collect();

    return Promise.all(
      workOrders.map(async (wo) => {
        const mechanic = await ctx.db.get(wo.mechanicId);
        return {
          ...wo,
          mechanicName:
            mechanic?.firstName && mechanic?.lastName
              ? `${mechanic.firstName} ${mechanic.lastName}`
              : mechanic?.name,
          mechanicCompany: mechanic?.companyName,
        };
      })
    );
  },
});

export const getWorkOrder = query({
  args: { workOrderId: v.id("workOrders") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return null;

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) return null;

    const vessel = await ctx.db.get(workOrder.vesselId);
    if (!vessel) return null;

    if (user.role === "owner" && vessel.ownerId !== user._id) return null;
    if (user.role === "mechanic" && workOrder.mechanicId !== user._id) return null;

    const [mechanic, parts, photos, rating, owner] = await Promise.all([
      ctx.db.get(workOrder.mechanicId),
      ctx.db
        .query("workOrderParts")
        .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
        .collect(),
      ctx.db
        .query("workOrderPhotos")
        .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
        .collect(),
      ctx.db
        .query("ratings")
        .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
        .first(),
      ctx.db.get(vessel.ownerId),
    ]);

    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => ({
        ...photo,
        url: await getFileUrl(ctx, photo.storageId) ?? "",
      }))
    );

    return {
      ...workOrder,
      vessel: {
        name: vessel.name,
        make: vessel.make,
        model: vessel.model,
        year: vessel.year,
        ownerName:
          owner?.firstName && owner?.lastName
            ? `${owner.firstName} ${owner.lastName}`
            : owner?.name,
      },
      mechanic: {
        name:
          mechanic?.firstName && mechanic?.lastName
            ? `${mechanic.firstName} ${mechanic.lastName}`
            : mechanic?.name,
        company: mechanic?.companyName,
        phone: mechanic?.phone,
      },
      parts,
      photos: photosWithUrls,
      rating,
    };
  },
});

export const getMyWorkOrders = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("quote_requested"),
        v.literal("quoted"),
        v.literal("declined"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user || user.role !== "mechanic") return [];

    let q = ctx.db
      .query("workOrders")
      .withIndex("by_mechanic", (q) => q.eq("mechanicId", user._id));

    if (args.status) {
      q = q.filter((f) => f.eq(f.field("status"), args.status));
    }

    const workOrders = await q.order("desc").collect();

    return Promise.all(
      workOrders.map(async (wo) => {
        const vessel = await ctx.db.get(wo.vesselId);
        const owner = vessel ? await ctx.db.get(vessel.ownerId) : null;
        const requestingOwner = wo.requestedByOwnerId
          ? await ctx.db.get(wo.requestedByOwnerId)
          : null;
        return {
          ...wo,
          vesselName: vessel?.name,
          vesselMake: vessel?.make,
          vesselModel: vessel?.model,
          ownerName:
            owner?.firstName && owner?.lastName
              ? `${owner.firstName} ${owner.lastName}`
              : owner?.name,
          requestingOwnerName:
            requestingOwner?.firstName && requestingOwner?.lastName
              ? `${requestingOwner.firstName} ${requestingOwner.lastName}`
              : requestingOwner?.name,
        };
      })
    );
  },
});

export const getPendingQuoteRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user || user.role !== "mechanic") return [];

    const requests = await ctx.db
      .query("workOrders")
      .withIndex("by_mechanic", (q) => q.eq("mechanicId", user._id))
      .filter((q) => q.eq(q.field("status"), "quote_requested"))
      .order("desc")
      .collect();

    return Promise.all(
      requests.map(async (wo) => {
        const vessel = await ctx.db.get(wo.vesselId);
        const owner = vessel ? await ctx.db.get(vessel.ownerId) : null;
        const requestingOwner = wo.requestedByOwnerId
          ? await ctx.db.get(wo.requestedByOwnerId)
          : null;
        const equipment = wo.equipmentId ? await ctx.db.get(wo.equipmentId) : null;
        return {
          ...wo,
          vesselName: vessel?.name,
          vesselMake: vessel?.make,
          vesselModel: vessel?.model,
          ownerName:
            owner?.firstName && owner?.lastName
              ? `${owner.firstName} ${owner.lastName}`
              : owner?.name,
          ownerPhone: owner?.phone,
          requestingOwnerName:
            requestingOwner?.firstName && requestingOwner?.lastName
              ? `${requestingOwner.firstName} ${requestingOwner.lastName}`
              : requestingOwner?.name,
          equipmentName: equipment?.name,
          equipmentCategory: equipment?.category,
        };
      })
    );
  },
});

export const getMyWorkOrderRequests = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("quote_requested"),
        v.literal("quoted"),
        v.literal("declined"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user || user.role !== "owner") return [];

    let q = ctx.db
      .query("workOrders")
      .withIndex("by_requested_owner", (q) =>
        q.eq("requestedByOwnerId", user._id)
      );

    if (args.status) {
      q = q.filter((f) => f.eq(f.field("status"), args.status));
    }

    const workOrders = await q.order("desc").collect();

    return Promise.all(
      workOrders.map(async (wo) => {
        const vessel = await ctx.db.get(wo.vesselId);
        const mechanic = await ctx.db.get(wo.mechanicId);
        const equipment = wo.equipmentId ? await ctx.db.get(wo.equipmentId) : null;
        return {
          ...wo,
          vesselName: vessel?.name,
          vesselMake: vessel?.make,
          vesselModel: vessel?.model,
          mechanicName:
            mechanic?.firstName && mechanic?.lastName
              ? `${mechanic.firstName} ${mechanic.lastName}`
              : mechanic?.name,
          mechanicCompany: mechanic?.companyName,
          mechanicPhone: mechanic?.phone,
          equipmentName: equipment?.name,
          equipmentCategory: equipment?.category,
        };
      })
    );
  },
});

export const createWorkOrder = mutation({
  args: {
    vesselId: v.id("vessels"),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireRole(ctx, "mechanic");

    requireMaxLength(args.description, "Description", 2000);

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) throw Errors.notFound("Vessel");

    const vesselAuth = await ctx.db
      .query("mechanicAuthorizations")
      .withIndex("by_vessel_mechanic", (q) =>
        q.eq("vesselId", args.vesselId).eq("mechanicId", userId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!vesselAuth) {
      const fleetId = vessel.fleetId;
      if (!fleetId) throw Errors.accessDenied();
      const fleetAuth = await ctx.db
        .query("fleetMechanicAuthorizations")
        .withIndex("by_fleet_mechanic", (q) => q.eq("fleetId", fleetId).eq("mechanicId", userId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();
      if (!fleetAuth) throw Errors.accessDenied();
    }

    const workOrderId = await ctx.db.insert("workOrders", {
      vesselId: args.vesselId,
      mechanicId: userId,
      status: "in_progress",
      description: args.description,
      startedAt: Date.now(),
    });

    await workOrderStarted(ctx, {
      ownerId: vessel.ownerId,
      mechanicName: user.companyName || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "A mechanic"),
      vesselName: vessel.name,
      workOrderId,
    });

    await logAudit(ctx, {
      action: "work_order.created",
      actorId: userId,
      targetId: workOrderId,
      targetType: "workOrders",
      after: { vesselId: args.vesselId, status: "in_progress" },
    });

    return { workOrderId };
  },
});

export const requestWorkOrder = mutation({
  args: {
    vesselId: v.id("vessels"),
    mechanicId: v.id("users"),
    description: v.string(),
    urgency: v.optional(
      v.union(v.literal("routine"), v.literal("soon"), v.literal("urgent"))
    ),
    equipmentId: v.optional(v.id("vesselEquipment")),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireRole(ctx, "owner");

    requireMaxLength(args.description, "Description", 2000);

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) throw Errors.notFound("Vessel");
    if (vessel.ownerId !== userId) throw Errors.accessDenied();

    const mechanic = await ctx.db.get(args.mechanicId);
    if (!mechanic || mechanic.role !== "mechanic") {
      throw Errors.validation("Invalid mechanic");
    }

    if (args.equipmentId) {
      const equipment = await ctx.db.get(args.equipmentId);
      if (!equipment || equipment.vesselId !== args.vesselId) {
        throw Errors.validation("Equipment not found on this vessel");
      }
    }

    const existingAuth = await ctx.db
      .query("mechanicAuthorizations")
      .withIndex("by_vessel_mechanic", (q) =>
        q.eq("vesselId", args.vesselId).eq("mechanicId", args.mechanicId)
      )
      .first();

    if (!existingAuth) {
      await ctx.db.insert("mechanicAuthorizations", {
        vesselId: args.vesselId,
        mechanicId: args.mechanicId,
        authorizedAt: Date.now(),
        authorizedBy: userId,
        isActive: true,
      });
    } else if (!existingAuth.isActive) {
      await ctx.db.patch(existingAuth._id, {
        isActive: true,
        authorizedAt: Date.now(),
        authorizedBy: userId,
      });
    }

    const workOrderId = await ctx.db.insert("workOrders", {
      vesselId: args.vesselId,
      mechanicId: args.mechanicId,
      requestedByOwnerId: userId,
      status: "quote_requested",
      description: args.description,
      urgency: args.urgency || "routine",
      equipmentId: args.equipmentId,
      startedAt: Date.now(),
    });

    await workOrderRequested(ctx, {
      mechanicId: args.mechanicId,
      ownerName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "An owner",
      vesselName: vessel.name,
      description: args.description,
      workOrderId,
    });

    await logAudit(ctx, {
      action: "work_order.created",
      actorId: userId,
      targetId: workOrderId,
      targetType: "workOrders",
      after: { vesselId: args.vesselId, mechanicId: args.mechanicId, status: "quote_requested" },
    });

    return { workOrderId };
  },
});

export const submitQuote = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    quotedLaborHours: v.number(),
    quotedLaborRate: v.number(),
    quotedPartsEstimate: v.optional(v.number()),
    quoteNotes: v.optional(v.string()),
    quoteValidDays: v.optional(v.number()),
    estimatedCompletionDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireRole(ctx, "mechanic");

    requirePositive(args.quotedLaborHours, "Labor hours");
    requireRange(args.quotedLaborHours, "Labor hours", 0.1, 9999);
    requireNonNegative(args.quotedLaborRate, "Labor rate");
    requireRange(args.quotedLaborRate, "Labor rate", 0, 99999);
    if (args.quotedPartsEstimate !== undefined) {
      requireNonNegative(args.quotedPartsEstimate, "Parts estimate");
    }
    if (args.quoteNotes !== undefined) {
      requireMaxLength(args.quoteNotes, "Quote notes", 1000);
    }

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw Errors.notFound("Work order");
    if (workOrder.mechanicId !== userId) throw Errors.accessDenied();
    if (workOrder.status !== "quote_requested") {
      throw Errors.validation("Work order is not awaiting a quote");
    }

    const laborTotal = args.quotedLaborHours * args.quotedLaborRate;
    const partsTotal = args.quotedPartsEstimate || 0;
    const quotedTotalEstimate = laborTotal + partsTotal;

    const quoteValidDays = args.quoteValidDays || 30;
    const quoteExpiresAt = Date.now() + quoteValidDays * 24 * 60 * 60 * 1000;

    await ctx.db.patch(args.workOrderId, {
      status: "quoted",
      quotedLaborHours: args.quotedLaborHours,
      quotedLaborRate: args.quotedLaborRate,
      quotedPartsEstimate: args.quotedPartsEstimate,
      quotedTotalEstimate,
      quoteNotes: args.quoteNotes,
      quotedAt: Date.now(),
      quoteExpiresAt,
      estimatedCompletionDate: args.estimatedCompletionDate,
    });

    const vessel = await ctx.db.get(workOrder.vesselId);
    const ownerId = workOrder.requestedByOwnerId || vessel?.ownerId;

    if (ownerId) {
      await quoteSubmitted(ctx, {
        ownerId,
        mechanicName: user.companyName || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "A mechanic"),
        vesselName: vessel?.name ?? "your vessel",
        totalQuote: quotedTotalEstimate,
        workOrderId: args.workOrderId,
      });
    }

    await logAudit(ctx, {
      action: "work_order.quote_submitted",
      actorId: userId,
      targetId: args.workOrderId,
      targetType: "workOrders",
      after: { quotedTotalEstimate, status: "quoted" },
    });

    return { success: true };
  },
});

export const declineWorkOrderRequest = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    declineReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireRole(ctx, "mechanic");

    if (args.declineReason !== undefined) requireMaxLength(args.declineReason, "Decline reason", 500);

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw Errors.notFound("Work order");
    if (workOrder.mechanicId !== userId) throw Errors.accessDenied();
    if (workOrder.status !== "quote_requested") {
      throw Errors.validation("Work order is not awaiting a quote");
    }

    await ctx.db.patch(args.workOrderId, {
      status: "declined",
      declineReason: args.declineReason,
      declinedAt: Date.now(),
    });

    const vessel = await ctx.db.get(workOrder.vesselId);
    const ownerId = workOrder.requestedByOwnerId || vessel?.ownerId;

    if (ownerId) {
      await requestDeclined(ctx, {
        ownerId,
        mechanicName: user.companyName || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "The mechanic"),
        vesselName: vessel?.name ?? "your vessel",
        workOrderId: args.workOrderId,
      });
    }

    await logAudit(ctx, {
      action: "work_order.status_changed",
      actorId: userId,
      targetId: args.workOrderId,
      targetType: "workOrders",
      before: { status: "quote_requested" },
      after: { status: "declined" },
    });

    return { success: true };
  },
});

export const acceptQuote = mutation({
  args: { workOrderId: v.id("workOrders") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireRole(ctx, "owner");

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw Errors.notFound("Work order");

    const vessel = await ctx.db.get(workOrder.vesselId);
    if (!vessel) throw Errors.notFound("Vessel");

    if (vessel.ownerId !== userId && workOrder.requestedByOwnerId !== userId) {
      throw Errors.accessDenied();
    }

    if (workOrder.status !== "quoted") {
      throw Errors.validation("Work order does not have a pending quote");
    }

    if (workOrder.quoteExpiresAt && workOrder.quoteExpiresAt < Date.now()) {
      throw Errors.validation(
        "Quote has expired. Please request a new quote from the mechanic."
      );
    }

    await ctx.db.patch(args.workOrderId, { status: "in_progress" });

    await quoteAccepted(ctx, {
      mechanicId: workOrder.mechanicId,
      ownerName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "The owner",
      vesselName: vessel.name,
      workOrderId: args.workOrderId,
    });

    await logAudit(ctx, {
      action: "work_order.quote_accepted",
      actorId: userId,
      targetId: args.workOrderId,
      targetType: "workOrders",
      before: { status: "quoted" },
      after: { status: "in_progress" },
    });

    return { success: true };
  },
});

export const declineQuote = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireRole(ctx, "owner");

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw Errors.notFound("Work order");

    const vessel = await ctx.db.get(workOrder.vesselId);
    if (!vessel) throw Errors.notFound("Vessel");

    if (vessel.ownerId !== userId && workOrder.requestedByOwnerId !== userId) {
      throw Errors.accessDenied();
    }

    if (workOrder.status !== "quoted") {
      throw Errors.validation("Work order does not have a pending quote");
    }

    await ctx.db.patch(args.workOrderId, {
      status: "cancelled",
      completedAt: Date.now(),
    });

    await quoteDeclined(ctx, {
      mechanicId: workOrder.mechanicId,
      ownerName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "The owner",
      vesselName: vessel.name,
      workOrderId: args.workOrderId,
    });

    await logAudit(ctx, {
      action: "work_order.quote_declined",
      actorId: userId,
      targetId: args.workOrderId,
      targetType: "workOrders",
      before: { status: "quoted" },
      after: { status: "cancelled" },
    });

    return { success: true };
  },
});

const DEFAULT_UPDATE_NOTIFICATION_THROTTLE_MINUTES = 30;

export const updateWorkOrder = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    description: v.optional(v.string()),
    diagnosis: v.optional(v.string()),
    workPerformed: v.optional(v.string()),
    laborHours: v.optional(v.number()),
    laborRate: v.optional(v.number()),
    totalCost: v.optional(v.number()),
    estimatedCompletionDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);

    if (args.description !== undefined) requireMaxLength(args.description, "Description", 2000);
    if (args.diagnosis !== undefined) requireMaxLength(args.diagnosis, "Diagnosis", 2000);
    if (args.workPerformed !== undefined) requireMaxLength(args.workPerformed, "Work performed", 5000);
    if (args.laborHours !== undefined) { requirePositive(args.laborHours, "Labor hours"); requireRange(args.laborHours, "Labor hours", 0.1, 9999); }
    if (args.laborRate !== undefined) { requireNonNegative(args.laborRate, "Labor rate"); requireRange(args.laborRate, "Labor rate", 0, 99999); }
    if (args.totalCost !== undefined) { requireNonNegative(args.totalCost, "Total cost"); requireRange(args.totalCost, "Total cost", 0, 9999999); }

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw Errors.notFound("Work order");

    if (user.role !== "admin" && workOrder.mechanicId !== userId) {
      throw Errors.accessDenied();
    }

    if (workOrder.status !== "in_progress") {
      throw Errors.validation("Cannot update a completed or cancelled work order");
    }

    const { workOrderId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(workOrderId, filteredUpdates);

    if (Object.keys(filteredUpdates).length > 0 && user.role === "mechanic") {
      const now = Date.now();
      const lastNotified = workOrder.lastUpdateNotifiedAt || 0;
      const throttleMinutes = await getSettingValue(
        ctx,
        "work_order_update_throttle_minutes",
        DEFAULT_UPDATE_NOTIFICATION_THROTTLE_MINUTES
      );
      const throttleMs = throttleMinutes * 60 * 1000;

      if (now - lastNotified >= throttleMs) {
        const vessel = await ctx.db.get(workOrder.vesselId);
        if (vessel) {
          await notify(ctx, {
            userId: vessel.ownerId,
            type: "work_order_updated",
            title: "Work Order Updated",
            message: `${user.companyName || user.name || "Your mechanic"} has made progress on the work order for ${vessel.name}`,
            relatedId: workOrderId,
            relatedType: "workOrder",
          });
          await ctx.db.patch(workOrderId, { lastUpdateNotifiedAt: now });
        }
      }
    }

    return { success: true };
  },
});

export const completeWorkOrder = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    workPerformed: v.string(),
    laborHours: v.optional(v.number()),
    laborRate: v.optional(v.number()),
    totalCost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);

    requireMaxLength(args.workPerformed, "Work performed", 5000);
    if (args.laborHours !== undefined) { requirePositive(args.laborHours, "Labor hours"); requireRange(args.laborHours, "Labor hours", 0.1, 9999); }
    if (args.laborRate !== undefined) { requireNonNegative(args.laborRate, "Labor rate"); requireRange(args.laborRate, "Labor rate", 0, 99999); }
    if (args.totalCost !== undefined) { requireNonNegative(args.totalCost, "Total cost"); requireRange(args.totalCost, "Total cost", 0, 9999999); }

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw Errors.notFound("Work order");
    if (workOrder.mechanicId !== userId) throw Errors.accessDenied();
    if (workOrder.status !== "in_progress") {
      throw Errors.validation("Work order is not in progress");
    }

    const vessel = await ctx.db.get(workOrder.vesselId);

    await ctx.db.patch(args.workOrderId, {
      status: "completed",
      workPerformed: args.workPerformed,
      laborHours: args.laborHours,
      laborRate: args.laborRate,
      totalCost: args.totalCost,
      completedAt: Date.now(),
    });

    if (vessel) {
      const mechanicName =
        user.companyName ||
        (user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : "The mechanic");

      await workOrderCompleted(ctx, {
        ownerId: vessel.ownerId,
        mechanicName,
        vesselName: vessel.name,
        workOrderId: args.workOrderId,
      });

      await rateMechanicReminder(ctx, {
        ownerId: vessel.ownerId,
        mechanicName,
        vesselName: vessel.name,
        workOrderId: args.workOrderId,
      });

      await rateOwnerReminder(ctx, {
        mechanicId: workOrder.mechanicId,
        vesselName: vessel.name,
        workOrderId: args.workOrderId,
      });
    }

    await logAudit(ctx, {
      action: "work_order.completed",
      actorId: userId,
      targetId: args.workOrderId,
      targetType: "workOrders",
      before: { status: "in_progress" },
      after: { status: "completed" },
    });

    return { success: true };
  },
});

export const cancelWorkOrder = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);

    if (args.reason !== undefined) requireMaxLength(args.reason, "Cancellation reason", 500);

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw Errors.notFound("Work order");

    const vessel = await ctx.db.get(workOrder.vesselId);
    if (!vessel) throw Errors.notFound("Vessel");

    const canCancel =
      user.role === "admin" ||
      workOrder.mechanicId === userId ||
      vessel.ownerId === userId ||
      workOrder.requestedByOwnerId === userId;

    if (!canCancel) throw Errors.accessDenied();

    const cancellableStatuses = ["in_progress", "quote_requested", "quoted"];
    if (!cancellableStatuses.includes(workOrder.status)) {
      throw Errors.validation("Work order cannot be cancelled in its current status");
    }

    await ctx.db.patch(args.workOrderId, {
      status: "cancelled",
      completedAt: Date.now(),
    });

    const isOwnerCancelling =
      user.role === "owner" || workOrder.requestedByOwnerId === userId;

    const cancellerName = isOwnerCancelling
      ? (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "The owner")
      : (user.companyName || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "The mechanic"));
    const recipientId = isOwnerCancelling ? workOrder.mechanicId : vessel.ownerId;

    await workOrderCancelled(ctx, {
      recipientId,
      cancellerName,
      vesselName: vessel.name,
      workOrderId: args.workOrderId,
    });

    await logAudit(ctx, {
      action: "work_order.cancelled",
      actorId: userId,
      targetId: args.workOrderId,
      targetType: "workOrders",
      before: { status: workOrder.status },
      after: { status: "cancelled" },
    });

    return { success: true };
  },
});

export const addPart = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    name: v.string(),
    partNumber: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    category: v.optional(v.string()),
    quantity: v.number(),
    unitCost: v.optional(v.number()),
    warrantyExpiry: v.optional(v.number()),
    warrantyTerms: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, "mechanic");

    requireMaxLength(args.name, "Part name", 200);
    if (args.partNumber !== undefined) requireMaxLength(args.partNumber, "Part number", 100);
    if (args.serialNumber !== undefined) requireMaxLength(args.serialNumber, "Serial number", 100);
    if (args.manufacturer !== undefined) requireMaxLength(args.manufacturer, "Manufacturer", 100);
    if (args.category !== undefined) requireMaxLength(args.category, "Category", 100);
    if (args.warrantyTerms !== undefined) requireMaxLength(args.warrantyTerms, "Warranty terms", 1000);
    requirePositive(args.quantity, "Quantity");
    requireRange(args.quantity, "Quantity", 1, 99999);
    if (args.unitCost !== undefined) {
      requireNonNegative(args.unitCost, "Unit cost");
      requireRange(args.unitCost, "Unit cost", 0, 999999);
    }

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw Errors.notFound("Work order");
    if (workOrder.mechanicId !== userId) throw Errors.accessDenied();
    if (workOrder.status !== "in_progress") {
      throw Errors.validation("Cannot add parts to a completed work order");
    }

    if (args.partNumber && args.manufacturer) {
      const existingPart = await ctx.db
        .query("partsDatabase")
        .withIndex("by_partNumber", (q) => q.eq("partNumber", args.partNumber!))
        .first();

      if (existingPart) {
        await ctx.db.patch(existingPart._id, {
          usageCount: existingPart.usageCount + 1,
        });
      } else {
        const validCategories = [
          "engine","electrical","plumbing","fuel","cooling",
          "steering","hvac","safety","general",
        ];
        const category =
          args.category && validCategories.includes(args.category)
            ? (args.category as
                | "engine" | "electrical" | "plumbing" | "fuel" | "cooling"
                | "steering" | "hvac" | "safety" | "general")
            : "general";

        await ctx.db.insert("partsDatabase", {
          partNumber: args.partNumber,
          name: args.name,
          manufacturer: args.manufacturer,
          category,
          averagePrice: args.unitCost,
          isSeeded: false,
          usageCount: 1,
          createdAt: Date.now(),
        });
      }
    }

    const partId = await ctx.db.insert("workOrderParts", {
      workOrderId: args.workOrderId,
      name: args.name,
      partNumber: args.partNumber,
      serialNumber: args.serialNumber,
      manufacturer: args.manufacturer,
      category: args.category,
      quantity: args.quantity,
      unitCost: args.unitCost,
      warrantyExpiry: args.warrantyExpiry,
      warrantyTerms: args.warrantyTerms,
      photoStorageId: args.photoStorageId,
      addedAt: Date.now(),
    });

    return { partId };
  },
});

export const removePart = mutation({
  args: { partId: v.id("workOrderParts") },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, "mechanic");

    const part = await ctx.db.get(args.partId);
    if (!part) throw Errors.notFound("Part");

    const workOrder = await ctx.db.get(part.workOrderId);
    if (!workOrder) throw Errors.notFound("Work order");
    if (workOrder.mechanicId !== userId) throw Errors.accessDenied();
    if (workOrder.status !== "in_progress") {
      throw Errors.validation("Cannot remove parts from a completed work order");
    }

    await ctx.db.delete(args.partId);
    return { success: true };
  },
});
