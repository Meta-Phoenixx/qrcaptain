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
          mechanicName: mechanic?.fullName,
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

    return {
      ...workOrder,
      vessel: {
        name: vessel.name,
        make: vessel.make,
        model: vessel.model,
        year: vessel.year,
      },
      mechanic: {
        name: mechanic?.fullName,
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

    // Enrich with vessel info
    const enriched = await Promise.all(
      workOrders.map(async (wo) => {
        const vessel = await ctx.db.get(wo.vesselId);
        return {
          ...wo,
          vesselName: vessel?.name,
          vesselMake: vessel?.make,
          vesselModel: vessel?.model,
        };
      })
    );

    return enriched;
  },
});

// Create a new work order
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

    return { workOrderId };
  },
});

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

    await ctx.db.patch(workOrderId, filteredUpdates);
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

    await ctx.db.patch(args.workOrderId, {
      status: "completed",
      workPerformed: args.workPerformed,
      laborHours: args.laborHours,
      laborRate: args.laborRate,
      totalCost: args.totalCost,
      completedAt: Date.now(),
    });

    return { success: true };
  },
});

// Cancel a work order
export const cancelWorkOrder = mutation({
  args: { workOrderId: v.id("workOrders") },
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
      vessel.ownerId === userId;

    if (!canCancel) {
      throw new Error("Not authorized to cancel this work order");
    }

    if (workOrder.status !== "in_progress") {
      throw new Error("Work order is not in progress");
    }

    await ctx.db.patch(args.workOrderId, {
      status: "cancelled",
      completedAt: Date.now(),
    });

    return { success: true };
  },
});

// Add a part to a work order
export const addPart = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    name: v.string(),
    partNumber: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    quantity: v.number(),
    unitCost: v.optional(v.number()),
    warrantyExpiry: v.optional(v.number()),
    warrantyTerms: v.optional(v.string()),
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

    const partId = await ctx.db.insert("workOrderParts", {
      workOrderId: args.workOrderId,
      name: args.name,
      partNumber: args.partNumber,
      serialNumber: args.serialNumber,
      manufacturer: args.manufacturer,
      quantity: args.quantity,
      unitCost: args.unitCost,
      warrantyExpiry: args.warrantyExpiry,
      warrantyTerms: args.warrantyTerms,
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
