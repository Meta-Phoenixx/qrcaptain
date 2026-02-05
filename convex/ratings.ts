import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// ============ LEGACY RATINGS (backward compatibility) ============

// Get ratings for a mechanic (legacy)
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

// Get ratings given by the current owner (legacy)
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

// Create a rating for a completed work order (legacy)
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

// Update an existing rating (legacy)
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

// ============ NEW DUAL RATING SYSTEM ============

// Check if a work order can be rated and by whom
export const canRateWorkOrder = query({
  args: { workOrderId: v.id("workOrders") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { canRate: false, reason: "Not authenticated" };

    const user = await ctx.db.get(userId);
    if (!user) return { canRate: false, reason: "User not found" };

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) return { canRate: false, reason: "Work order not found" };

    // Must be completed
    if (workOrder.status !== "completed") {
      return { canRate: false, reason: "Work order must be completed" };
    }

    // Check rating window (30 days from completion)
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    if (workOrder.completedAt && Date.now() - workOrder.completedAt > thirtyDaysMs) {
      return { canRate: false, reason: "Rating window has closed (30 days)" };
    }

    const vessel = await ctx.db.get(workOrder.vesselId);

    if (user.role === "owner") {
      // Owner rates mechanic
      if (vessel?.ownerId !== userId && workOrder.requestedByOwnerId !== userId) {
        return { canRate: false, reason: "Not authorized" };
      }

      // Check if already rated
      const existingRating = await ctx.db
        .query("mechanicRatings")
        .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
        .first();

      if (existingRating) {
        return { canRate: false, reason: "Already rated", existingRatingId: existingRating._id };
      }

      return { canRate: true, ratingType: "mechanic" };
    }

    if (user.role === "mechanic") {
      // Mechanic rates owner
      if (workOrder.mechanicId !== userId) {
        return { canRate: false, reason: "Not authorized" };
      }

      // Check if already rated
      const existingRating = await ctx.db
        .query("ownerRatings")
        .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
        .first();

      if (existingRating) {
        return { canRate: false, reason: "Already rated", existingRatingId: existingRating._id };
      }

      return { canRate: true, ratingType: "owner" };
    }

    return { canRate: false, reason: "Invalid role" };
  },
});

// ============ MECHANIC RATINGS (Owner rates Mechanic - Wrench icons) ============

// Create a mechanic rating (owner rates mechanic)
export const createMechanicRating = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    qualityRating: v.number(),        // 1-5
    communicationRating: v.number(),  // 1-5
    professionalismRating: v.number(), // 1-5
    valueRating: v.number(),          // 1-5
    overallRating: v.optional(v.number()), // 1-5 (auto-calculated if not provided)
    review: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") {
      throw new Error("Only owners can rate mechanics");
    }

    // Validate all ratings
    const ratings = [args.qualityRating, args.communicationRating, args.professionalismRating, args.valueRating];
    for (const rating of ratings) {
      if (rating < 1 || rating > 5) {
        throw new Error("All ratings must be between 1 and 5");
      }
    }

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw new Error("Work order not found");

    if (workOrder.status !== "completed") {
      throw new Error("Can only rate completed work orders");
    }

    const vessel = await ctx.db.get(workOrder.vesselId);
    if (!vessel || (vessel.ownerId !== userId && workOrder.requestedByOwnerId !== userId)) {
      throw new Error("Not authorized to rate this work order");
    }

    // Check rating window
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    if (workOrder.completedAt && Date.now() - workOrder.completedAt > thirtyDaysMs) {
      throw new Error("Rating window has closed (30 days from completion)");
    }

    // Check if already rated
    const existingRating = await ctx.db
      .query("mechanicRatings")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .first();

    if (existingRating) {
      throw new Error("Work order already rated");
    }

    // Calculate overall rating if not provided
    const overallRating = args.overallRating || 
      (args.qualityRating + args.communicationRating + args.professionalismRating + args.valueRating) / 4;

    if (overallRating < 1 || overallRating > 5) {
      throw new Error("Overall rating must be between 1 and 5");
    }

    const ratingId = await ctx.db.insert("mechanicRatings", {
      workOrderId: args.workOrderId,
      ownerId: userId,
      mechanicId: workOrder.mechanicId,
      qualityRating: args.qualityRating,
      communicationRating: args.communicationRating,
      professionalismRating: args.professionalismRating,
      valueRating: args.valueRating,
      overallRating: Math.round(overallRating * 10) / 10, // Round to 1 decimal
      review: args.review,
      createdAt: Date.now(),
    });

    // Notify mechanic of new rating
    const mechanic = await ctx.db.get(workOrder.mechanicId);
    await ctx.db.insert("notifications", {
      userId: workOrder.mechanicId,
      type: "new_rating_received",
      title: "New Rating Received",
      message: `${user.fullName || "An owner"} has rated you ${overallRating.toFixed(1)} wrenches for work on ${vessel.name}`,
      relatedId: ratingId,
      relatedType: "mechanicRating",
      isRead: false,
      createdAt: Date.now(),
    });

    // Update mechanic metrics (would be better as scheduled function)
    await ctx.scheduler.runAfter(0, internal.mechanicDirectory.updateMechanicMetrics, {
      mechanicId: workOrder.mechanicId,
    });

    return { ratingId };
  },
});

// Get mechanic ratings with criteria breakdown
export const getMechanicRatingsDetailed = query({
  args: { mechanicId: v.id("users") },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("mechanicRatings")
      .withIndex("by_mechanic_created", (q) => q.eq("mechanicId", args.mechanicId))
      .order("desc")
      .collect();

    // Enrich with work order info
    const enriched = await Promise.all(
      ratings.map(async (rating) => {
        const workOrder = await ctx.db.get(rating.workOrderId);
        const vessel = workOrder ? await ctx.db.get(workOrder.vesselId) : null;

        return {
          ...rating,
          vesselType: vessel?.vesselType,
          vesselMake: vessel?.make,
          workDescription: workOrder?.description,
          completedAt: workOrder?.completedAt,
        };
      })
    );

    return enriched;
  },
});

// Get mechanic average ratings per criteria
export const getMechanicAverageRatings = query({
  args: { mechanicId: v.id("users") },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("mechanicRatings")
      .withIndex("by_mechanic", (q) => q.eq("mechanicId", args.mechanicId))
      .collect();

    if (ratings.length === 0) {
      return {
        totalRatings: 0,
        avgOverall: null,
        avgQuality: null,
        avgCommunication: null,
        avgProfessionalism: null,
        avgValue: null,
      };
    }

    const avgOverall = ratings.reduce((sum, r) => sum + r.overallRating, 0) / ratings.length;
    const avgQuality = ratings.reduce((sum, r) => sum + r.qualityRating, 0) / ratings.length;
    const avgCommunication = ratings.reduce((sum, r) => sum + r.communicationRating, 0) / ratings.length;
    const avgProfessionalism = ratings.reduce((sum, r) => sum + r.professionalismRating, 0) / ratings.length;
    const avgValue = ratings.reduce((sum, r) => sum + r.valueRating, 0) / ratings.length;

    return {
      totalRatings: ratings.length,
      avgOverall: Math.round(avgOverall * 10) / 10,
      avgQuality: Math.round(avgQuality * 10) / 10,
      avgCommunication: Math.round(avgCommunication * 10) / 10,
      avgProfessionalism: Math.round(avgProfessionalism * 10) / 10,
      avgValue: Math.round(avgValue * 10) / 10,
    };
  },
});

// ============ OWNER RATINGS (Mechanic rates Owner - Star icons) ============

// Create an owner rating (mechanic rates owner)
export const createOwnerRating = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    communicationRating: v.number(),  // 1-5
    preparednessRating: v.number(),   // 1-5
    paymentRating: v.number(),        // 1-5
    respectRating: v.number(),        // 1-5
    overallRating: v.optional(v.number()), // 1-5 (auto-calculated if not provided)
    review: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "mechanic") {
      throw new Error("Only mechanics can rate owners");
    }

    // Validate all ratings
    const ratings = [args.communicationRating, args.preparednessRating, args.paymentRating, args.respectRating];
    for (const rating of ratings) {
      if (rating < 1 || rating > 5) {
        throw new Error("All ratings must be between 1 and 5");
      }
    }

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw new Error("Work order not found");

    if (workOrder.status !== "completed") {
      throw new Error("Can only rate completed work orders");
    }

    if (workOrder.mechanicId !== userId) {
      throw new Error("Not authorized to rate this work order");
    }

    // Check rating window
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    if (workOrder.completedAt && Date.now() - workOrder.completedAt > thirtyDaysMs) {
      throw new Error("Rating window has closed (30 days from completion)");
    }

    // Check if already rated
    const existingRating = await ctx.db
      .query("ownerRatings")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .first();

    if (existingRating) {
      throw new Error("Work order already rated");
    }

    // Get the owner ID
    const vessel = await ctx.db.get(workOrder.vesselId);
    if (!vessel) throw new Error("Vessel not found");
    const ownerId = workOrder.requestedByOwnerId || vessel.ownerId;

    // Calculate overall rating if not provided
    const overallRating = args.overallRating || 
      (args.communicationRating + args.preparednessRating + args.paymentRating + args.respectRating) / 4;

    if (overallRating < 1 || overallRating > 5) {
      throw new Error("Overall rating must be between 1 and 5");
    }

    const ratingId = await ctx.db.insert("ownerRatings", {
      workOrderId: args.workOrderId,
      mechanicId: userId,
      ownerId,
      communicationRating: args.communicationRating,
      preparednessRating: args.preparednessRating,
      paymentRating: args.paymentRating,
      respectRating: args.respectRating,
      overallRating: Math.round(overallRating * 10) / 10,
      review: args.review,
      createdAt: Date.now(),
    });

    // Notify owner of new rating
    await ctx.db.insert("notifications", {
      userId: ownerId,
      type: "new_rating_received",
      title: "New Rating Received",
      message: `${user.companyName || user.fullName || "A mechanic"} has rated you ${overallRating.toFixed(1)} stars`,
      relatedId: ratingId,
      relatedType: "ownerRating",
      isRead: false,
      createdAt: Date.now(),
    });

    return { ratingId };
  },
});

// Get owner ratings with criteria breakdown
export const getOwnerRatingsDetailed = query({
  args: { ownerId: v.id("users") },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("ownerRatings")
      .withIndex("by_owner_created", (q) => q.eq("ownerId", args.ownerId))
      .order("desc")
      .collect();

    // Enrich with work order info
    const enriched = await Promise.all(
      ratings.map(async (rating) => {
        const workOrder = await ctx.db.get(rating.workOrderId);
        const vessel = workOrder ? await ctx.db.get(workOrder.vesselId) : null;
        const mechanic = await ctx.db.get(rating.mechanicId);

        return {
          ...rating,
          vesselName: vessel?.name,
          mechanicCompany: mechanic?.companyName,
          workDescription: workOrder?.description,
          completedAt: workOrder?.completedAt,
        };
      })
    );

    return enriched;
  },
});

// Get owner average ratings per criteria
export const getOwnerAverageRatings = query({
  args: { ownerId: v.id("users") },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("ownerRatings")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .collect();

    if (ratings.length === 0) {
      return {
        totalRatings: 0,
        avgOverall: null,
        avgCommunication: null,
        avgPreparedness: null,
        avgPayment: null,
        avgRespect: null,
      };
    }

    const avgOverall = ratings.reduce((sum, r) => sum + r.overallRating, 0) / ratings.length;
    const avgCommunication = ratings.reduce((sum, r) => sum + r.communicationRating, 0) / ratings.length;
    const avgPreparedness = ratings.reduce((sum, r) => sum + r.preparednessRating, 0) / ratings.length;
    const avgPayment = ratings.reduce((sum, r) => sum + r.paymentRating, 0) / ratings.length;
    const avgRespect = ratings.reduce((sum, r) => sum + r.respectRating, 0) / ratings.length;

    return {
      totalRatings: ratings.length,
      avgOverall: Math.round(avgOverall * 10) / 10,
      avgCommunication: Math.round(avgCommunication * 10) / 10,
      avgPreparedness: Math.round(avgPreparedness * 10) / 10,
      avgPayment: Math.round(avgPayment * 10) / 10,
      avgRespect: Math.round(avgRespect * 10) / 10,
    };
  },
});

// Get pending ratings for the current user (work orders they haven't rated yet)
export const getPendingRatings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user) return [];

    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = Date.now() - thirtyDaysMs;

    if (user.role === "owner") {
      // Get owner's vessels
      const vessels = await ctx.db
        .query("vessels")
        .withIndex("by_owner", (q) => q.eq("ownerId", userId))
        .collect();

      const vesselIds = vessels.map(v => v._id);

      // Get completed work orders for owner's vessels within 30 days
      const completedWorkOrders = await ctx.db
        .query("workOrders")
        .withIndex("by_status", (q) => q.eq("status", "completed"))
        .filter((q) => 
          q.and(
            q.gte(q.field("completedAt"), thirtyDaysAgo),
            q.or(...vesselIds.map(id => q.eq(q.field("vesselId"), id)))
          )
        )
        .collect();

      // Also get work orders requested by owner
      const requestedWorkOrders = await ctx.db
        .query("workOrders")
        .withIndex("by_requested_owner", (q) => q.eq("requestedByOwnerId", userId))
        .filter((q) => 
          q.and(
            q.eq(q.field("status"), "completed"),
            q.gte(q.field("completedAt"), thirtyDaysAgo)
          )
        )
        .collect();

      // Combine and deduplicate
      const allWorkOrders = [...completedWorkOrders, ...requestedWorkOrders];
      const uniqueWorkOrders = allWorkOrders.filter((wo, index, self) =>
        index === self.findIndex(w => w._id === wo._id)
      );

      // Filter out already rated
      const pending = [];
      for (const wo of uniqueWorkOrders) {
        const existingRating = await ctx.db
          .query("mechanicRatings")
          .withIndex("by_work_order", (q) => q.eq("workOrderId", wo._id))
          .first();

        if (!existingRating) {
          const mechanic = await ctx.db.get(wo.mechanicId);
          const vessel = await ctx.db.get(wo.vesselId);
          pending.push({
            workOrderId: wo._id,
            description: wo.description,
            completedAt: wo.completedAt,
            mechanicName: mechanic?.companyName || mechanic?.fullName,
            vesselName: vessel?.name,
          });
        }
      }

      return pending;
    }

    if (user.role === "mechanic") {
      // Get mechanic's completed work orders within 30 days
      const completedWorkOrders = await ctx.db
        .query("workOrders")
        .withIndex("by_mechanic", (q) => q.eq("mechanicId", userId))
        .filter((q) => 
          q.and(
            q.eq(q.field("status"), "completed"),
            q.gte(q.field("completedAt"), thirtyDaysAgo)
          )
        )
        .collect();

      // Filter out already rated
      const pending = [];
      for (const wo of completedWorkOrders) {
        const existingRating = await ctx.db
          .query("ownerRatings")
          .withIndex("by_work_order", (q) => q.eq("workOrderId", wo._id))
          .first();

        if (!existingRating) {
          const vessel = await ctx.db.get(wo.vesselId);
          const owner = vessel ? await ctx.db.get(vessel.ownerId) : null;
          pending.push({
            workOrderId: wo._id,
            description: wo.description,
            completedAt: wo.completedAt,
            ownerName: owner?.fullName || owner?.name,
            vesselName: vessel?.name,
          });
        }
      }

      return pending;
    }

    return [];
  },
});
