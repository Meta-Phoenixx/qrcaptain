import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// List all approved mechanics for the directory
export const listMechanics = query({
  args: {
    // Filters
    availabilityStatus: v.optional(v.union(
      v.literal("available"),
      v.literal("limited"),
      v.literal("at_capacity"),
      v.literal("unavailable")
    )),
    serviceArea: v.optional(v.string()),
    specialization: v.optional(v.string()),
    minRating: v.optional(v.number()),
    
    // Sorting
    sortBy: v.optional(v.union(
      v.literal("rating"),
      v.literal("responseTime"),
      v.literal("jobsCompleted"),
      v.literal("name")
    )),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    
    // Pagination
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { mechanics: [], nextCursor: null };

    // Get all mechanics with completed onboarding
    let mechanics = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "mechanic"))
      .filter((q) => q.eq(q.field("onboardingCompleted"), true))
      .collect();

    // Apply filters
    if (args.availabilityStatus) {
      mechanics = mechanics.filter(m => m.availabilityStatus === args.availabilityStatus);
    }

    if (args.serviceArea) {
      mechanics = mechanics.filter(m => 
        m.serviceAreas?.some(area => 
          area.toLowerCase().includes(args.serviceArea!.toLowerCase())
        )
      );
    }

    if (args.specialization) {
      mechanics = mechanics.filter(m => 
        m.specializations?.some(spec => 
          spec.toLowerCase().includes(args.specialization!.toLowerCase())
        )
      );
    }

    // Get metrics for all mechanics
    const mechanicsWithMetrics = await Promise.all(
      mechanics.map(async (mechanic) => {
        // Get cached metrics
        const metrics = await ctx.db
          .query("mechanicMetrics")
          .withIndex("by_mechanic", (q) => q.eq("mechanicId", mechanic._id))
          .first();

        // Get company logo or profile photo URL
        let imageUrl = null;
        if (mechanic.companyLogoStorageId) {
          imageUrl = await ctx.storage.getUrl(mechanic.companyLogoStorageId);
        } else if (mechanic.profilePhotoStorageId) {
          imageUrl = await ctx.storage.getUrl(mechanic.profilePhotoStorageId);
        }

        return {
          _id: mechanic._id,
          companyName: mechanic.companyName,
          fullName: mechanic.fullName,
          imageUrl,
          availabilityStatus: mechanic.availabilityStatus || "available",
          serviceAreas: mechanic.serviceAreas || [],
          specializations: mechanic.specializations || [],
          certifications: mechanic.certifications || [],
          businessYearsInOperation: mechanic.businessYearsInOperation,
          isInsured: mechanic.isInsured,
          isBonded: mechanic.isBonded,
          hasMobileCapabilities: mechanic.hasMobileCapabilities,
          // Metrics
          avgOverallRating: metrics?.avgOverallRating || null,
          totalRatings: metrics?.totalRatings || 0,
          avgResponseTimeMinutes: metrics?.avgResponseTimeMinutes || null,
          totalJobsCompleted: metrics?.totalJobsCompleted || 0,
        };
      })
    );

    // Filter by minimum rating
    let filtered = mechanicsWithMetrics;
    if (args.minRating) {
      filtered = filtered.filter(m => 
        m.avgOverallRating !== null && m.avgOverallRating >= args.minRating!
      );
    }

    // Sort
    const sortOrder = args.sortOrder || "desc";
    const sortMultiplier = sortOrder === "desc" ? -1 : 1;

    filtered.sort((a, b) => {
      switch (args.sortBy) {
        case "rating":
          return ((b.avgOverallRating || 0) - (a.avgOverallRating || 0)) * sortMultiplier;
        case "responseTime":
          // Lower response time is better, so reverse the comparison
          const aTime = a.avgResponseTimeMinutes ?? Infinity;
          const bTime = b.avgResponseTimeMinutes ?? Infinity;
          return (aTime - bTime) * sortMultiplier;
        case "jobsCompleted":
          return (b.totalJobsCompleted - a.totalJobsCompleted) * sortMultiplier;
        case "name":
          const aName = a.companyName || a.fullName || "";
          const bName = b.companyName || b.fullName || "";
          return aName.localeCompare(bName) * sortMultiplier;
        default:
          // Default: sort by rating then jobs completed
          if (b.avgOverallRating !== a.avgOverallRating) {
            return ((b.avgOverallRating || 0) - (a.avgOverallRating || 0));
          }
          return b.totalJobsCompleted - a.totalJobsCompleted;
      }
    });

    // Pagination
    const limit = args.limit || 20;
    const result = filtered.slice(0, limit);

    return {
      mechanics: result,
      nextCursor: filtered.length > limit ? String(limit) : null,
    };
  },
});

// Get detailed mechanic profile (spotlight view)
export const getMechanicSpotlight = query({
  args: { mechanicId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const mechanic = await ctx.db.get(args.mechanicId);
    if (!mechanic || mechanic.role !== "mechanic") return null;

    // Get metrics
    const metrics = await ctx.db
      .query("mechanicMetrics")
      .withIndex("by_mechanic", (q) => q.eq("mechanicId", args.mechanicId))
      .first();

    // Get recent reviews (last 10)
    const recentRatings = await ctx.db
      .query("mechanicRatings")
      .withIndex("by_mechanic_created", (q) => q.eq("mechanicId", args.mechanicId))
      .order("desc")
      .take(10);

    // Enrich ratings with owner info (anonymous)
    const ratingsWithInfo = await Promise.all(
      recentRatings.map(async (rating) => {
        const workOrder = await ctx.db.get(rating.workOrderId);
        const vessel = workOrder ? await ctx.db.get(workOrder.vesselId) : null;
        return {
          ...rating,
          vesselType: vessel?.vesselType,
          vesselMake: vessel?.make,
        };
      })
    );

    // Get images
    let companyLogoUrl = null;
    let profilePhotoUrl = null;
    if (mechanic.companyLogoStorageId) {
      companyLogoUrl = await ctx.storage.getUrl(mechanic.companyLogoStorageId);
    }
    if (mechanic.profilePhotoStorageId) {
      profilePhotoUrl = await ctx.storage.getUrl(mechanic.profilePhotoStorageId);
    }

    // Check if current user has this mechanic in their preferred list
    const currentUser = await ctx.db.get(userId);
    let isPreferred = false;
    if (currentUser?.role === "owner") {
      const preferred = await ctx.db
        .query("preferredMechanics")
        .withIndex("by_owner_mechanic", (q) => 
          q.eq("ownerId", userId).eq("mechanicId", args.mechanicId)
        )
        .first();
      isPreferred = !!preferred;
    }

    // Format response time
    let responseTimeDisplay = null;
    if (metrics?.avgResponseTimeMinutes) {
      const minutes = metrics.avgResponseTimeMinutes;
      if (minutes < 60) {
        responseTimeDisplay = `${Math.round(minutes)} minutes`;
      } else if (minutes < 1440) {
        responseTimeDisplay = `${Math.round(minutes / 60)} hours`;
      } else {
        responseTimeDisplay = `${Math.round(minutes / 1440)} days`;
      }
    }

    return {
      _id: mechanic._id,
      companyName: mechanic.companyName,
      fullName: mechanic.fullName,
      companyLogoUrl,
      profilePhotoUrl,
      bio: mechanic.bio,
      phone: mechanic.phone,
      email: mechanic.email,
      websiteUrl: mechanic.websiteUrl,
      googleMyBusinessUrl: mechanic.googleMyBusinessUrl,
      
      // Business info
      businessYearsInOperation: mechanic.businessYearsInOperation,
      businessLicenseNumber: mechanic.businessLicenseNumber,
      businessAddress: mechanic.businessAddress,
      
      // Services
      serviceAreas: mechanic.serviceAreas || [],
      serviceTypes: mechanic.serviceTypes || [],
      specializations: mechanic.specializations || [],
      certifications: mechanic.certifications || [],
      hoursOfOperation: mechanic.hoursOfOperation,
      
      // Capabilities
      isInsured: mechanic.isInsured,
      isBonded: mechanic.isBonded,
      hasMobileCapabilities: mechanic.hasMobileCapabilities,
      languagesSpoken: mechanic.languagesSpoken || [],
      
      // Status
      availabilityStatus: mechanic.availabilityStatus || "available",
      
      // Metrics
      avgOverallRating: metrics?.avgOverallRating || null,
      totalRatings: metrics?.totalRatings || 0,
      avgResponseTimeMinutes: metrics?.avgResponseTimeMinutes || null,
      responseTimeDisplay,
      totalJobsCompleted: metrics?.totalJobsCompleted || 0,
      
      // Reviews
      recentReviews: ratingsWithInfo,
      
      // For current user
      isPreferred,
    };
  },
});

// Update mechanic's availability status
export const updateAvailabilityStatus = mutation({
  args: {
    status: v.union(
      v.literal("available"),
      v.literal("limited"),
      v.literal("at_capacity"),
      v.literal("unavailable")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "mechanic") {
      throw new Error("Only mechanics can update their availability status");
    }

    await ctx.db.patch(userId, {
      availabilityStatus: args.status,
      availabilityStatusUpdatedAt: Date.now(),
      isAvailabilityManuallySet: true,
    });

    return { success: true };
  },
});

// Get suggested availability status based on active jobs
export const getSuggestedAvailabilityStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "mechanic") return null;

    // Count active work orders (in_progress and quote_requested)
    const activeWorkOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_mechanic", (q) => q.eq("mechanicId", userId))
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "in_progress"),
          q.eq(q.field("status"), "quote_requested"),
          q.eq(q.field("status"), "quoted")
        )
      )
      .collect();

    const activeCount = activeWorkOrders.length;
    const maxJobs = user.maxConcurrentJobs || 5; // Default to 5 if not set

    let suggestedStatus: "available" | "limited" | "at_capacity" | "unavailable";
    
    if (activeCount === 0) {
      suggestedStatus = "available";
    } else if (activeCount < maxJobs * 0.5) {
      suggestedStatus = "available";
    } else if (activeCount < maxJobs * 0.8) {
      suggestedStatus = "limited";
    } else if (activeCount < maxJobs) {
      suggestedStatus = "at_capacity";
    } else {
      suggestedStatus = "at_capacity";
    }

    return {
      currentStatus: user.availabilityStatus || "available",
      suggestedStatus,
      activeJobCount: activeCount,
      maxConcurrentJobs: maxJobs,
      isManuallySet: user.isAvailabilityManuallySet || false,
    };
  },
});

// Update mechanic's max concurrent jobs setting
export const updateMaxConcurrentJobs = mutation({
  args: {
    maxConcurrentJobs: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "mechanic") {
      throw new Error("Only mechanics can update their settings");
    }

    if (args.maxConcurrentJobs < 1 || args.maxConcurrentJobs > 50) {
      throw new Error("Max concurrent jobs must be between 1 and 50");
    }

    await ctx.db.patch(userId, {
      maxConcurrentJobs: args.maxConcurrentJobs,
    });

    return { success: true };
  },
});

// Internal mutation to update mechanic metrics (called by cron or after work order completion)
export const updateMechanicMetrics = internalMutation({
  args: { mechanicId: v.id("users") },
  handler: async (ctx, args) => {
    const mechanic = await ctx.db.get(args.mechanicId);
    if (!mechanic || mechanic.role !== "mechanic") return;

    // Calculate total jobs completed
    const completedWorkOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_mechanic", (q) => q.eq("mechanicId", args.mechanicId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    const totalJobsCompleted = completedWorkOrders.length;

    // Calculate total cancelled
    const cancelledWorkOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_mechanic", (q) => q.eq("mechanicId", args.mechanicId))
      .filter((q) => q.eq(q.field("status"), "cancelled"))
      .collect();

    const totalJobsCancelled = cancelledWorkOrders.length;

    // Calculate average rating from mechanicRatings
    const ratings = await ctx.db
      .query("mechanicRatings")
      .withIndex("by_mechanic", (q) => q.eq("mechanicId", args.mechanicId))
      .collect();

    let avgOverallRating: number | undefined = undefined;
    const totalRatings = ratings.length;
    if (totalRatings > 0) {
      const sum = ratings.reduce((acc, r) => acc + r.overallRating, 0);
      avgOverallRating = sum / totalRatings;
    }

    // Check if metrics record exists
    const existingMetrics = await ctx.db
      .query("mechanicMetrics")
      .withIndex("by_mechanic", (q) => q.eq("mechanicId", args.mechanicId))
      .first();

    const metricsData = {
      mechanicId: args.mechanicId,
      totalJobsCompleted,
      totalJobsCancelled,
      avgOverallRating,
      totalRatings,
      updatedAt: Date.now(),
    };

    if (existingMetrics) {
      await ctx.db.patch(existingMetrics._id, metricsData);
    } else {
      await ctx.db.insert("mechanicMetrics", metricsData);
    }
  },
});

// Search mechanics by name or company
export const searchMechanics = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (!args.searchTerm || args.searchTerm.length < 2) return [];

    const searchLower = args.searchTerm.toLowerCase();
    const limit = args.limit || 10;

    // Get all mechanics and filter by search term
    const mechanics = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "mechanic"))
      .filter((q) => q.eq(q.field("onboardingCompleted"), true))
      .collect();

    const matched = mechanics.filter(m => 
      m.companyName?.toLowerCase().includes(searchLower) ||
      m.fullName?.toLowerCase().includes(searchLower)
    );

    // Get basic info for results
    const results = await Promise.all(
      matched.slice(0, limit).map(async (mechanic) => {
        let imageUrl = null;
        if (mechanic.companyLogoStorageId) {
          imageUrl = await ctx.storage.getUrl(mechanic.companyLogoStorageId);
        } else if (mechanic.profilePhotoStorageId) {
          imageUrl = await ctx.storage.getUrl(mechanic.profilePhotoStorageId);
        }

        const metrics = await ctx.db
          .query("mechanicMetrics")
          .withIndex("by_mechanic", (q) => q.eq("mechanicId", mechanic._id))
          .first();

        return {
          _id: mechanic._id,
          companyName: mechanic.companyName,
          fullName: mechanic.fullName,
          imageUrl,
          availabilityStatus: mechanic.availabilityStatus || "available",
          avgOverallRating: metrics?.avgOverallRating || null,
          totalRatings: metrics?.totalRatings || 0,
        };
      })
    );

    return results;
  },
});
