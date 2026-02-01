import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get ratings for a mechanic
export const getMechanicRatings = query({
  args: { mechanicId: v.id("users") },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_mechanic", (q) => q.eq("mechanicId", args.mechanicId))
      .order("desc")
      .collect();

    // Enrich with owner and work order info
    const enriched = await Promise.all(
      ratings.map(async (rating) => {
        const owner = await ctx.db.get(rating.ownerId);
        const workOrder = await ctx.db.get(rating.workOrderId);
        const vessel = workOrder ? await ctx.db.get(workOrder.vesselId) : null;

        return {
          ...rating,
          ownerName: owner?.fullName,
          vesselName: vessel?.name,
          workDescription: workOrder?.description,
          completedAt: workOrder?.completedAt,
        };
      })
    );

    return enriched;
  },
});

// Get ratings given by the current owner
export const getMyRatings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") return [];

    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .order("desc")
      .collect();

    // Enrich with mechanic and work order info
    const enriched = await Promise.all(
      ratings.map(async (rating) => {
        const mechanic = await ctx.db.get(rating.mechanicId);
        const workOrder = await ctx.db.get(rating.workOrderId);
        const vessel = workOrder ? await ctx.db.get(workOrder.vesselId) : null;

        return {
          ...rating,
          mechanicName: mechanic?.fullName,
          mechanicCompany: mechanic?.companyName,
          vesselName: vessel?.name,
          workDescription: workOrder?.description,
        };
      })
    );

    return enriched;
  },
});

// Create a rating for a completed work order
export const createRating = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    rating: v.number(), // 1-5
    review: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") {
      throw new Error("Only owners can rate mechanics");
    }

    // Validate rating value
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw new Error("Work order not found");

    // Verify the work order is completed
    if (workOrder.status !== "completed") {
      throw new Error("Can only rate completed work orders");
    }

    // Verify the vessel belongs to this owner
    const vessel = await ctx.db.get(workOrder.vesselId);
    if (!vessel || vessel.ownerId !== userId) {
      throw new Error("Not authorized to rate this work order");
    }

    // Check if already rated
    const existingRating = await ctx.db
      .query("ratings")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .first();

    if (existingRating) {
      throw new Error("Work order already rated");
    }

    const ratingId = await ctx.db.insert("ratings", {
      workOrderId: args.workOrderId,
      ownerId: userId,
      mechanicId: workOrder.mechanicId,
      rating: args.rating,
      review: args.review,
    });

    return { ratingId };
  },
});

// Update an existing rating
export const updateRating = mutation({
  args: {
    ratingId: v.id("ratings"),
    rating: v.optional(v.number()),
    review: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existingRating = await ctx.db.get(args.ratingId);
    if (!existingRating) throw new Error("Rating not found");

    if (existingRating.ownerId !== userId) {
      throw new Error("Not authorized to update this rating");
    }

    // Validate rating value if provided
    if (args.rating !== undefined && (args.rating < 1 || args.rating > 5)) {
      throw new Error("Rating must be between 1 and 5");
    }

    const updates: { rating?: number; review?: string } = {};
    if (args.rating !== undefined) updates.rating = args.rating;
    if (args.review !== undefined) updates.review = args.review;

    await ctx.db.patch(args.ratingId, updates);
    return { success: true };
  },
});
