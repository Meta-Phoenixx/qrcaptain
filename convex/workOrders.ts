import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get work orders for a vessel
export const getVesselWorkOrders = query({
  args: { vesselId: v.id("vessels") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user) return [];

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) return [];

    // Check access
    if (user.role === "owner" && vessel.ownerId !== userId) {
      return [];
    }

    if (user.role === "mechanic") {
      const auth = await ctx.db
        .query("mechanicAuthorizations")
        .withIndex("by_vessel_mechanic", (q) =>
          q.eq("vesselId", args.vesselId).eq("mechanicId", userId)
        )
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      if (!auth) return [];
    }

    const workOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_vessel", (q) => q.eq("vesselId", args.vesselId))
      .order("desc")
      .collect();

    // Enrich with mechanic info
    const enriched = await Promise.all(
      workOrders.map(async (wo) => {
        const mechanic = await ctx.db.get(wo.mechanicId);
        return {
          ...wo,
          mechanicName: mechanic?.firstName && mechanic?.lastName 
            ? `${mechanic.firstName} ${mechanic.lastName}` 
            : mechanic?.name,
          mechanicCompany: mechanic?.companyName,
        };
      })
    );

    return enriched;
  },
});

// Get a single work order with all details
export const getWorkOrder = query({
  args: { workOrderId: v.id("workOrders") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) return null;

    const vessel = await ctx.db.get(workOrder.vesselId);
    if (!vessel) return null;

    // Check access
    if (user.role === "owner" && vessel.ownerId !== userId) {
      return null;
    }

    if (user.role === "mechanic" && workOrder.mechanicId !== userId) {
      return null;
    }

    // Get related data
    const mechanic = await ctx.db.get(workOrder.mechanicId);
    const parts = await ctx.db
      .query("workOrderParts")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();

    const photos = await ctx.db
      .query("workOrderPhotos")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();

    const rating = await ctx.db
      .query("ratings")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .first();

    // Get photo URLs
    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => ({
        ...photo,
        url: await ctx.storage.getUrl(photo.storageId),
      }))
    );

    // Get owner info for chat
    const owner = await ctx.db.get(vessel.ownerId);

    return {
      ...workOrder,
      vessel: {
        name: vessel.name,
        make: vessel.make,
        model: vessel.model,
        year: vessel.year,
        ownerName: owner?.firstName && owner?.lastName 
          ? `${owner.firstName} ${owner.lastName}` 
          : owner?.name,
      },
      mechanic: {
        name: mechanic?.firstName && mechanic?.lastName 
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

// Get work orders for the current mechanic
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
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "mechanic") return [];

    let query = ctx.db
      .query("workOrders")
      .withIndex("by_mechanic", (q) => q.eq("mechanicId", userId));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const workOrders = await query.order("desc").collect();

    // Enrich with vessel and owner info
    const enriched = await Promise.all(
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
          ownerName: owner?.firstName && owner?.lastName 
            ? `${owner.firstName} ${owner.lastName}` 
            : owner?.name,
          requestingOwnerName: requestingOwner?.firstName && requestingOwner?.lastName 
            ? `${requestingOwner.firstName} ${requestingOwner.lastName}` 
            : requestingOwner?.name,
        };
      })
    );

    return enriched;
  },
});

// Get pending quote requests for the current mechanic
export const getPendingQuoteRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "mechanic") return [];

    const requests = await ctx.db
      .query("workOrders")
      .withIndex("by_mechanic", (q) => q.eq("mechanicId", userId))
      .filter((q) => q.eq(q.field("status"), "quote_requested"))
      .order("desc")
      .collect();

    // Enrich with vessel and owner info
    const enriched = await Promise.all(
      requests.map(async (wo) => {
        const vessel = await ctx.db.get(wo.vesselId);
        const owner = vessel ? await ctx.db.get(vessel.ownerId) : null;
        const requestingOwner = wo.requestedByOwnerId 
          ? await ctx.db.get(wo.requestedByOwnerId) 
          : null;
        const equipment = wo.equipmentId 
          ? await ctx.db.get(wo.equipmentId) 
          : null;
        return {
          ...wo,
          vesselName: vessel?.name,
          vesselMake: vessel?.make,
          vesselModel: vessel?.model,
          ownerName: owner?.firstName && owner?.lastName 
            ? `${owner.firstName} ${owner.lastName}` 
            : owner?.name,
          ownerPhone: owner?.phone,
          requestingOwnerName: requestingOwner?.firstName && requestingOwner?.lastName 
            ? `${requestingOwner.firstName} ${requestingOwner.lastName}` 
            : requestingOwner?.name,
          equipmentName: equipment?.name,
          equipmentCategory: equipment?.category,
        };
      })
    );

    return enriched;
  },
});

// Get work order requests created by the current owner
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
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") return [];

    let query = ctx.db
      .query("workOrders")
      .withIndex("by_requested_owner", (q) => q.eq("requestedByOwnerId", userId));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const workOrders = await query.order("desc").collect();

    // Enrich with vessel and mechanic info
    const enriched = await Promise.all(
      workOrders.map(async (wo) => {
        const vessel = await ctx.db.get(wo.vesselId);
        const mechanic = await ctx.db.get(wo.mechanicId);
        const equipment = wo.equipmentId 
          ? await ctx.db.get(wo.equipmentId) 
          : null;
        return {
          ...wo,
          vesselName: vessel?.name,
          vesselMake: vessel?.make,
          vesselModel: vessel?.model,
          mechanicName: mechanic?.firstName && mechanic?.lastName 
            ? `${mechanic.firstName} ${mechanic.lastName}` 
            : mechanic?.name,
          mechanicCompany: mechanic?.companyName,
          mechanicPhone: mechanic?.phone,
          equipmentName: equipment?.name,
          equipmentCategory: equipment?.category,
        };
      })
    );

    return enriched;
  },
});

// Create a new work order (mechanic-initiated)
export const createWorkOrder = mutation({
  args: {
    vesselId: v.id("vessels"),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "mechanic") {
      throw new Error("Only mechanics can create work orders");
    }

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) throw new Error("Vessel not found");

    // Check if mechanic is authorized for this vessel
    const auth = await ctx.db
      .query("mechanicAuthorizations")
      .withIndex("by_vessel_mechanic", (q) =>
        q.eq("vesselId", args.vesselId).eq("mechanicId", userId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!auth) {
      throw new Error("Not authorized to work on this vessel");
    }

    const workOrderId = await ctx.db.insert("workOrders", {
      vesselId: args.vesselId,
      mechanicId: userId,
      status: "in_progress",
      description: args.description,
      startedAt: Date.now(),
    });

    // Notify owner that work has started
    await ctx.db.insert("notifications", {
      userId: vessel.ownerId,
      type: "work_order_started",
      title: "Work Order Started",
      message: `${user.companyName || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "A mechanic")} has started work on ${vessel.name}`,
      relatedId: workOrderId,
      relatedType: "workOrder",
      isRead: false,
      createdAt: Date.now(),
    });

    return { workOrderId };
  },
});

// Request a work order (owner-initiated)
export const requestWorkOrder = mutation({
  args: {
    vesselId: v.id("vessels"),
    mechanicId: v.id("users"),
    description: v.string(),
    urgency: v.optional(v.union(
      v.literal("routine"),
      v.literal("soon"),
      v.literal("urgent")
    )),
    equipmentId: v.optional(v.id("vesselEquipment")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") {
      throw new Error("Only owners can request work orders");
    }

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) throw new Error("Vessel not found");

    // Verify owner owns this vessel
    if (vessel.ownerId !== userId) {
      throw new Error("You do not own this vessel");
    }

    // Verify mechanic exists and is a mechanic
    const mechanic = await ctx.db.get(args.mechanicId);
    if (!mechanic || mechanic.role !== "mechanic") {
      throw new Error("Invalid mechanic");
    }

    // Verify equipment belongs to vessel if specified
    if (args.equipmentId) {
      const equipment = await ctx.db.get(args.equipmentId);
      if (!equipment || equipment.vesselId !== args.vesselId) {
        throw new Error("Equipment not found on this vessel");
      }
    }

    // Auto-authorize mechanic for this vessel if not already authorized
    const existingAuth = await ctx.db
      .query("mechanicAuthorizations")
      .withIndex("by_vessel_mechanic", (q) =>
        q.eq("vesselId", args.vesselId).eq("mechanicId", args.mechanicId)
      )
      .first();

    if (!existingAuth) {
      // Create new authorization
      await ctx.db.insert("mechanicAuthorizations", {
        vesselId: args.vesselId,
        mechanicId: args.mechanicId,
        authorizedAt: Date.now(),
        authorizedBy: userId,
        isActive: true,
      });
    } else if (!existingAuth.isActive) {
      // Re-activate existing authorization
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

    // Notify mechanic of the request
    await ctx.db.insert("notifications", {
      userId: args.mechanicId,
      type: "work_order_requested",
      title: "New Work Order Request",
      message: `${user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "An owner"} has requested work on ${vessel.name}: ${args.description.substring(0, 100)}${args.description.length > 100 ? "..." : ""}`,
      relatedId: workOrderId,
      relatedType: "workOrder",
      isRead: false,
      createdAt: Date.now(),
    });

    return { workOrderId };
  },
});

// Submit a quote for a work order request
export const submitQuote = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    quotedLaborHours: v.number(),
    quotedLaborRate: v.number(),
    quotedPartsEstimate: v.optional(v.number()),
    quoteNotes: v.optional(v.string()),
    quoteValidDays: v.optional(v.number()), // How many days the quote is valid
    estimatedCompletionDate: v.optional(v.number()), // Estimated completion timestamp
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "mechanic") {
      throw new Error("Only mechanics can submit quotes");
    }

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw new Error("Work order not found");

    if (workOrder.mechanicId !== userId) {
      throw new Error("Not authorized to quote this work order");
    }

    if (workOrder.status !== "quote_requested") {
      throw new Error("Work order is not awaiting a quote");
    }

    const laborTotal = args.quotedLaborHours * args.quotedLaborRate;
    const partsTotal = args.quotedPartsEstimate || 0;
    const quotedTotalEstimate = laborTotal + partsTotal;

    const quoteValidDays = args.quoteValidDays || 30;
    const quoteExpiresAt = Date.now() + (quoteValidDays * 24 * 60 * 60 * 1000);

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

    // Notify owner
    const vessel = await ctx.db.get(workOrder.vesselId);
    const ownerId = workOrder.requestedByOwnerId || vessel?.ownerId;
    
    if (ownerId) {
      await ctx.db.insert("notifications", {
        userId: ownerId,
        type: "quote_submitted",
        title: "Quote Received",
        message: `${user.companyName || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "A mechanic")} has submitted a quote for $${quotedTotalEstimate.toFixed(2)}`,
        relatedId: args.workOrderId,
        relatedType: "workOrder",
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Mechanic declines a work order request
export const declineWorkOrderRequest = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    declineReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "mechanic") {
      throw new Error("Only mechanics can decline work order requests");
    }

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw new Error("Work order not found");

    if (workOrder.mechanicId !== userId) {
      throw new Error("Not authorized to decline this work order");
    }

    if (workOrder.status !== "quote_requested") {
      throw new Error("Work order is not awaiting a quote");
    }

    await ctx.db.patch(args.workOrderId, {
      status: "declined",
      declineReason: args.declineReason,
      declinedAt: Date.now(),
    });

    // Notify owner
    const vessel = await ctx.db.get(workOrder.vesselId);
    const ownerId = workOrder.requestedByOwnerId || vessel?.ownerId;
    
    if (ownerId) {
      await ctx.db.insert("notifications", {
        userId: ownerId,
        type: "request_declined",
        title: "Work Order Request Declined",
        message: `${user.companyName || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "The mechanic")} has declined your work order request${args.declineReason ? `: ${args.declineReason}` : ""}`,
        relatedId: args.workOrderId,
        relatedType: "workOrder",
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Owner accepts a quote
export const acceptQuote = mutation({
  args: {
    workOrderId: v.id("workOrders"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") {
      throw new Error("Only owners can accept quotes");
    }

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw new Error("Work order not found");

    const vessel = await ctx.db.get(workOrder.vesselId);
    if (!vessel) throw new Error("Vessel not found");

    // Check if owner owns the vessel or requested the work order
    if (vessel.ownerId !== userId && workOrder.requestedByOwnerId !== userId) {
      throw new Error("Not authorized to accept this quote");
    }

    if (workOrder.status !== "quoted") {
      throw new Error("Work order does not have a pending quote");
    }

    // Check if quote has expired
    if (workOrder.quoteExpiresAt && workOrder.quoteExpiresAt < Date.now()) {
      throw new Error("Quote has expired. Please request a new quote from the mechanic.");
    }

    await ctx.db.patch(args.workOrderId, {
      status: "in_progress",
    });

    // Notify mechanic
    const mechanic = await ctx.db.get(workOrder.mechanicId);
    await ctx.db.insert("notifications", {
      userId: workOrder.mechanicId,
      type: "quote_accepted",
      title: "Quote Accepted",
      message: `${user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "The owner"} has accepted your quote for ${vessel.name}. You can now begin work.`,
      relatedId: args.workOrderId,
      relatedType: "workOrder",
      isRead: false,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Owner declines a quote
export const declineQuote = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") {
      throw new Error("Only owners can decline quotes");
    }

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw new Error("Work order not found");

    const vessel = await ctx.db.get(workOrder.vesselId);
    if (!vessel) throw new Error("Vessel not found");

    // Check if owner owns the vessel or requested the work order
    if (vessel.ownerId !== userId && workOrder.requestedByOwnerId !== userId) {
      throw new Error("Not authorized to decline this quote");
    }

    if (workOrder.status !== "quoted") {
      throw new Error("Work order does not have a pending quote");
    }

    await ctx.db.patch(args.workOrderId, {
      status: "cancelled",
      completedAt: Date.now(),
    });

    // Notify mechanic
    await ctx.db.insert("notifications", {
      userId: workOrder.mechanicId,
      type: "quote_declined",
      title: "Quote Declined",
      message: `${user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "The owner"} has declined your quote for ${vessel.name}${args.reason ? `: ${args.reason}` : ""}`,
      relatedId: args.workOrderId,
      relatedType: "workOrder",
      isRead: false,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Default throttle duration (30 minutes) - can be overridden in admin settings
const DEFAULT_UPDATE_NOTIFICATION_THROTTLE_MINUTES = 30;

// Helper to get setting from database
async function getSettingValue(ctx: any, key: string, defaultValue: number): Promise<number> {
  const setting = await ctx.db
    .query("appSettings")
    .withIndex("by_key", (q: any) => q.eq("key", key))
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

// Update a work order
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw new Error("Work order not found");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Only the assigned mechanic or admin can update
    if (user.role !== "admin" && workOrder.mechanicId !== userId) {
      throw new Error("Not authorized to update this work order");
    }

    if (workOrder.status !== "in_progress") {
      throw new Error("Cannot update a completed or cancelled work order");
    }

    const { workOrderId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    // Check if there are meaningful updates (not just empty fields)
    const hasMeaningfulUpdates = Object.keys(filteredUpdates).length > 0;

    await ctx.db.patch(workOrderId, filteredUpdates);
    
    // Send throttled notification to owner when mechanic updates the work order
    if (hasMeaningfulUpdates && user.role === "mechanic") {
      const now = Date.now();
      const lastNotified = workOrder.lastUpdateNotifiedAt || 0;
      const timeSinceLastNotification = now - lastNotified;
      
      // Get throttle duration from admin settings
      const throttleMinutes = await getSettingValue(
        ctx, 
        "work_order_update_throttle_minutes", 
        DEFAULT_UPDATE_NOTIFICATION_THROTTLE_MINUTES
      );
      const throttleMs = throttleMinutes * 60 * 1000;
      
      // Only send notification if enough time has passed
      if (timeSinceLastNotification >= throttleMs) {
        // Get vessel to find the owner
        const vessel = await ctx.db.get(workOrder.vesselId);
        if (vessel && vessel.ownerId) {
          // Get mechanic name for the notification
          const mechanicName = user.companyName || user.name || "Your mechanic";
          
          // Create notification for the owner
          await ctx.db.insert("notifications", {
            userId: vessel.ownerId,
            type: "work_order_updated",
            title: "Work Order Updated",
            message: `${mechanicName} has made progress on the work order for ${vessel.name}`,
            relatedId: workOrderId,
            relatedType: "workOrder",
            isRead: false,
            createdAt: now,
          });
          
          // Update the throttle timestamp
          await ctx.db.patch(workOrderId, { lastUpdateNotifiedAt: now });
        }
      }
    }
    
    return { success: true };
  },
});

// Complete a work order
export const completeWorkOrder = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    workPerformed: v.string(),
    laborHours: v.optional(v.number()),
    laborRate: v.optional(v.number()),
    totalCost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw new Error("Work order not found");

    if (workOrder.mechanicId !== userId) {
      throw new Error("Not authorized to complete this work order");
    }

    if (workOrder.status !== "in_progress") {
      throw new Error("Work order is not in progress");
    }

    const user = await ctx.db.get(userId);
    const vessel = await ctx.db.get(workOrder.vesselId);

    await ctx.db.patch(args.workOrderId, {
      status: "completed",
      workPerformed: args.workPerformed,
      laborHours: args.laborHours,
      laborRate: args.laborRate,
      totalCost: args.totalCost,
      completedAt: Date.now(),
    });

    // Notify owner that work is completed
    if (vessel) {
      await ctx.db.insert("notifications", {
        userId: vessel.ownerId,
        type: "work_order_completed",
        title: "Work Order Completed",
        message: `${user?.companyName || (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : "The mechanic")} has completed work on ${vessel.name}`,
        relatedId: args.workOrderId,
        relatedType: "workOrder",
        isRead: false,
        createdAt: Date.now(),
      });

      // Send rating reminder to owner (rate the mechanic with wrenches)
      await ctx.db.insert("notifications", {
        userId: vessel.ownerId,
        type: "rate_mechanic_reminder",
        title: "Rate Your Mechanic",
        message: `How was your experience with ${user?.companyName || (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : "the mechanic")}? Leave a review to help other boat owners.`,
        relatedId: args.workOrderId,
        relatedType: "workOrder",
        isRead: false,
        createdAt: Date.now(),
      });

      // Send rating reminder to mechanic (rate the owner with stars)
      await ctx.db.insert("notifications", {
        userId: workOrder.mechanicId,
        type: "rate_owner_reminder",
        title: "Rate the Owner",
        message: `How was your experience working with ${vessel.name}'s owner? Your feedback helps build trust in the community.`,
        relatedId: args.workOrderId,
        relatedType: "workOrder",
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Cancel a work order
export const cancelWorkOrder = mutation({
  args: { 
    workOrderId: v.id("workOrders"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw new Error("Work order not found");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Mechanic can cancel their own, owner can cancel for their vessel
    const vessel = await ctx.db.get(workOrder.vesselId);
    if (!vessel) throw new Error("Vessel not found");

    const canCancel =
      user.role === "admin" ||
      workOrder.mechanicId === userId ||
      vessel.ownerId === userId ||
      workOrder.requestedByOwnerId === userId;

    if (!canCancel) {
      throw new Error("Not authorized to cancel this work order");
    }

    // Can cancel if in progress, quote_requested, or quoted
    const cancellableStatuses = ["in_progress", "quote_requested", "quoted"];
    if (!cancellableStatuses.includes(workOrder.status)) {
      throw new Error("Work order cannot be cancelled in its current status");
    }

    await ctx.db.patch(args.workOrderId, {
      status: "cancelled",
      completedAt: Date.now(),
    });

    // Notify the other party
    if (user.role === "owner" || workOrder.requestedByOwnerId === userId) {
      // Owner cancelled, notify mechanic
      await ctx.db.insert("notifications", {
        userId: workOrder.mechanicId,
        type: "work_order_completed", // Using existing type for cancellation notice
        title: "Work Order Cancelled",
        message: `${user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "The owner"} has cancelled the work order for ${vessel.name}${args.reason ? `: ${args.reason}` : ""}`,
        relatedId: args.workOrderId,
        relatedType: "workOrder",
        isRead: false,
        createdAt: Date.now(),
      });
    } else {
      // Mechanic cancelled, notify owner
      await ctx.db.insert("notifications", {
        userId: vessel.ownerId,
        type: "work_order_completed",
        title: "Work Order Cancelled",
        message: `${user.companyName || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "The mechanic")} has cancelled the work order for ${vessel.name}${args.reason ? `: ${args.reason}` : ""}`,
        relatedId: args.workOrderId,
        relatedType: "workOrder",
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Add a part to a work order (with auto-catalog feature)
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw new Error("Work order not found");

    if (workOrder.mechanicId !== userId) {
      throw new Error("Not authorized to add parts to this work order");
    }

    if (workOrder.status !== "in_progress") {
      throw new Error("Cannot add parts to a completed work order");
    }

    // Auto-catalog: If part has a part number, add to/update the parts database
    if (args.partNumber && args.manufacturer) {
      const existingPart = await ctx.db
        .query("partsDatabase")
        .withIndex("by_partNumber", (q) => q.eq("partNumber", args.partNumber!))
        .first();

      if (existingPart) {
        // Increment usage count
        await ctx.db.patch(existingPart._id, {
          usageCount: existingPart.usageCount + 1,
        });
      } else {
        // Add new part to catalog
        const validCategories = ["engine", "electrical", "plumbing", "fuel", "cooling", "steering", "hvac", "safety", "general"];
        const category = args.category && validCategories.includes(args.category) 
          ? args.category as "engine" | "electrical" | "plumbing" | "fuel" | "cooling" | "steering" | "hvac" | "safety" | "general"
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

    // Add part to work order
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

// Remove a part from a work order
export const removePart = mutation({
  args: { partId: v.id("workOrderParts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const part = await ctx.db.get(args.partId);
    if (!part) throw new Error("Part not found");

    const workOrder = await ctx.db.get(part.workOrderId);
    if (!workOrder) throw new Error("Work order not found");

    if (workOrder.mechanicId !== userId) {
      throw new Error("Not authorized to remove parts from this work order");
    }

    if (workOrder.status !== "in_progress") {
      throw new Error("Cannot remove parts from a completed work order");
    }

    await ctx.db.delete(args.partId);
    return { success: true };
  },
});
