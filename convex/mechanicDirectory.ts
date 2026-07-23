import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthenticatedUser, requireRole } from "./lib/auth";
import { Errors } from "./lib/errors";
import { getFileUrl, getUserImageUrl } from "./lib/fileStorage";

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
    const user = await getAuthenticatedUser(ctx);
    if (!user) return { mechanics: [], nextCursor: null };
    const userId = user._id;

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
        const imageUrl = await getUserImageUrl(ctx, mechanic);

        return {
          _id: mechanic._id,
          companyName: mechanic.companyName,
          firstName: mechanic.firstName,
          lastName: mechanic.lastName,
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
          const aName = a.companyName || (a.firstName && a.lastName ? `${a.firstName} ${a.lastName}` : "") || "";
          const bName = b.companyName || (b.firstName && b.lastName ? `${b.firstName} ${b.lastName}` : "") || "";
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
    const user = await getAuthenticatedUser(ctx);
    if (!user) return null;

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
    const companyLogoUrl = await getFileUrl(ctx, mechanic.companyLogoStorageId);
    const profilePhotoUrl = await getFileUrl(ctx, mechanic.profilePhotoStorageId);

    // Check if current user has this mechanic in their preferred list
    let isPreferred = false;
    if (user.role === "owner") {
      const preferred = await ctx.db
        .query("preferredMechanics")
        .withIndex("by_owner_mechanic", (q) =>
          q.eq("ownerId", user._id).eq("mechanicId", args.mechanicId)
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
      firstName: mechanic.firstName,
      lastName: mechanic.lastName,
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
    const { userId } = await requireRole(ctx, "mechanic");

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
    const user = await getAuthenticatedUser(ctx);
    if (!user || user.role !== "mechanic") return null;
    const userId = user._id;

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
    const { userId } = await requireRole(ctx, "mechanic");

    if (args.maxConcurrentJobs < 1 || args.maxConcurrentJobs > 50) {
      throw Errors.validation("Max concurrent jobs must be between 1 and 50");
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
    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];

    if (!args.searchTerm || args.searchTerm.length < 2) return [];

    const searchLower = args.searchTerm.toLowerCase();
    const limit = args.limit || 10;

    // Get all mechanics and filter by search term
    const mechanics = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "mechanic"))
      .filter((q) => q.eq(q.field("onboardingCompleted"), true))
      .collect();

    // Deduplicate by _id before filtering (index can return same doc twice with multiple authAccounts)
    const seen = new Set<string>();
    const unique = mechanics.filter((m) => {
      if (seen.has(m._id)) return false;
      seen.add(m._id);
      return true;
    });

    const matched = unique.filter(m =>
      m.companyName?.toLowerCase().includes(searchLower) ||
      m.firstName?.toLowerCase().includes(searchLower) ||
      m.lastName?.toLowerCase().includes(searchLower)
    );

    // Get basic info for results
    const results = await Promise.all(
      matched.slice(0, limit).map(async (mechanic) => {
        const imageUrl = await getUserImageUrl(ctx, mechanic);

        const metrics = await ctx.db
          .query("mechanicMetrics")
          .withIndex("by_mechanic", (q) => q.eq("mechanicId", mechanic._id))
          .first();

        return {
          _id: mechanic._id,
          companyName: mechanic.companyName,
          firstName: mechanic.firstName,
          lastName: mechanic.lastName,
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

// Get featured mechanics for landing page (top-rated, available mechanics)
export const getFeaturedMechanics = query({
  args: {
    limit: v.optional(v.number()),
    serviceAreas: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];

    const limit = args.limit || 6;

    // Get all mechanics with completed onboarding
    let mechanics = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "mechanic"))
      .filter((q) => q.eq(q.field("onboardingCompleted"), true))
      .collect();

    // Filter to only available or limited availability mechanics
    mechanics = mechanics.filter(
      (m) =>
        m.availabilityStatus === "available" ||
        m.availabilityStatus === "limited" ||
        !m.availabilityStatus // Default to available if not set
    );

    // Filter by service areas if provided
    if (args.serviceAreas && args.serviceAreas.length > 0) {
      const searchAreas = args.serviceAreas.map((a) => a.toLowerCase());
      mechanics = mechanics.filter((m) =>
        m.serviceAreas?.some((area) =>
          searchAreas.some((searchArea) =>
            area.toLowerCase().includes(searchArea)
          )
        )
      );
    }

    // Get metrics and enrich data
    const mechanicsWithMetrics = await Promise.all(
      mechanics.map(async (mechanic) => {
        const metrics = await ctx.db
          .query("mechanicMetrics")
          .withIndex("by_mechanic", (q) => q.eq("mechanicId", mechanic._id))
          .first();

        const imageUrl = await getUserImageUrl(ctx, mechanic);

        return {
          _id: mechanic._id,
          companyName: mechanic.companyName,
          firstName: mechanic.firstName,
          lastName: mechanic.lastName,
          imageUrl,
          availabilityStatus: mechanic.availabilityStatus || "available",
          serviceAreas: mechanic.serviceAreas || [],
          specializations: mechanic.specializations || [],
          isInsured: mechanic.isInsured,
          hasMobileCapabilities: mechanic.hasMobileCapabilities,
          avgOverallRating: metrics?.avgOverallRating || null,
          totalRatings: metrics?.totalRatings || 0,
          totalJobsCompleted: metrics?.totalJobsCompleted || 0,
          avgResponseTimeMinutes: metrics?.avgResponseTimeMinutes || null,
        };
      })
    );

    // Score and sort mechanics for featuring
    // Prioritize: rating, jobs completed, response time, availability
    const scored = mechanicsWithMetrics.map((m) => {
      let score = 0;

      // Rating score (0-50 points)
      if (m.avgOverallRating) {
        score += m.avgOverallRating * 10;
      }

      // Jobs completed score (0-20 points)
      score += Math.min(m.totalJobsCompleted * 2, 20);

      // Response time score (0-15 points, lower is better)
      if (m.avgResponseTimeMinutes) {
        if (m.avgResponseTimeMinutes <= 30) score += 15;
        else if (m.avgResponseTimeMinutes <= 60) score += 12;
        else if (m.avgResponseTimeMinutes <= 120) score += 9;
        else if (m.avgResponseTimeMinutes <= 240) score += 6;
        else if (m.avgResponseTimeMinutes <= 480) score += 3;
      }

      // Availability bonus (0-10 points)
      if (m.availabilityStatus === "available") score += 10;
      else if (m.availabilityStatus === "limited") score += 5;

      // Trust badges (0-5 points)
      if (m.isInsured) score += 3;
      if (m.hasMobileCapabilities) score += 2;

      return { ...m, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Return top mechanics without the score
    return scored.slice(0, limit).map(({ score, ...mechanic }) => mechanic);
  },
});

// Get mechanic stats summary for the current user (for mechanic landing page)
export const getMechanicStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user || user.role !== "mechanic") return null;
    const userId = user._id;

    // Get work orders for this month
    const now = Date.now();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfMonthMs = startOfMonth.getTime();

    const allWorkOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_mechanic", (q) => q.eq("mechanicId", userId))
      .collect();

    const activeWorkOrders = allWorkOrders.filter(
      (wo) =>
        wo.status === "in_progress" ||
        wo.status === "quote_requested" ||
        wo.status === "quoted"
    );

    const completedThisMonth = allWorkOrders.filter(
      (wo) =>
        wo.status === "completed" &&
        wo.completedAt &&
        wo.completedAt >= startOfMonthMs
    );

    const pendingQuoteRequests = allWorkOrders.filter(
      (wo) => wo.status === "quote_requested"
    );

    // Get metrics
    const metrics = await ctx.db
      .query("mechanicMetrics")
      .withIndex("by_mechanic", (q) => q.eq("mechanicId", userId))
      .first();

    return {
      activeJobs: activeWorkOrders.length,
      completedThisMonth: completedThisMonth.length,
      pendingQuoteRequests: pendingQuoteRequests.length,
      totalJobsCompleted: metrics?.totalJobsCompleted || 0,
      avgOverallRating: metrics?.avgOverallRating || null,
      totalRatings: metrics?.totalRatings || 0,
      availabilityStatus: user.availabilityStatus || "available",
    };
  },
});
