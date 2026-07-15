import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthenticatedUser, requireAdmin } from "./lib/auth";
import { logAudit } from "./lib/audit";
import { Errors } from "./lib/errors";

// ============================================
// DEFAULT SETTINGS
// ============================================

export const DEFAULT_SETTINGS = {
  // Notification settings
  work_order_update_throttle_minutes: {
    value: 30,
    description: "Minutes between work order update notifications to owners",
    category: "notifications" as const,
  },
  
  // System settings
  max_vessels_per_owner: {
    value: 50,
    description: "Maximum number of vessels an owner can register",
    category: "system" as const,
  },
  
  // Work order settings
  quote_expiry_default_days: {
    value: 7,
    description: "Default number of days before a quote expires",
    category: "work_orders" as const,
  },
  
  // Mechanic settings
  max_active_work_orders: {
    value: 20,
    description: "Maximum concurrent active work orders per mechanic",
    category: "mechanics" as const,
  },
};

// ============================================
// QUERIES
// ============================================

export const getAllSettings = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user || user.role !== "admin") throw Errors.accessDenied();

    const settings = await ctx.db.query("appSettings").collect();
    
    // Merge with defaults to ensure all settings exist
    const settingsMap: Record<string, {
      key: string;
      value: string;
      description: string;
      category: string;
      updatedAt?: number;
      updatedBy?: string;
    }> = {};
    
    // Start with defaults
    for (const [key, config] of Object.entries(DEFAULT_SETTINGS)) {
      settingsMap[key] = {
        key,
        value: JSON.stringify(config.value),
        description: config.description,
        category: config.category,
      };
    }
    
    // Override with database values
    for (const setting of settings) {
      settingsMap[setting.key] = {
        key: setting.key,
        value: setting.value,
        description: setting.description,
        category: setting.category,
        updatedAt: setting.updatedAt,
        updatedBy: setting.updatedBy?.toString(),
      };
    }
    
    return Object.values(settingsMap);
  },
});

// Get a single setting value (any authenticated user)
export const getSetting = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    
    if (setting) {
      return JSON.parse(setting.value);
    }
    
    // Return default if not in database
    const defaultSetting = DEFAULT_SETTINGS[args.key as keyof typeof DEFAULT_SETTINGS];
    if (defaultSetting) {
      return defaultSetting.value;
    }
    
    return null;
  },
});

export const getSettingsByCategory = query({
  args: {
    category: v.union(
      v.literal("notifications"),
      v.literal("system"),
      v.literal("mechanics"),
      v.literal("owners"),
      v.literal("work_orders")
    )
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user || user.role !== "admin") throw Errors.accessDenied();

    const settings = await ctx.db
      .query("appSettings")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();

    const result: Record<string, { key: string; value: unknown; description: string; category: string; updatedAt?: number; isDefault: boolean }> = {};
    
    for (const [key, config] of Object.entries(DEFAULT_SETTINGS)) {
      if (config.category === args.category) {
        result[key] = {
          key,
          value: JSON.parse(JSON.stringify(config.value)),
          description: config.description,
          category: config.category,
          isDefault: true,
        };
      }
    }
    
    for (const setting of settings) {
      result[setting.key] = {
        key: setting.key,
        value: JSON.parse(setting.value),
        description: setting.description,
        category: setting.category,
        updatedAt: setting.updatedAt,
        isDefault: false,
      };
    }
    
    return Object.values(result);
  },
});

// ============================================
// MUTATIONS
// ============================================

export const updateSetting = mutation({
  args: {
    key: v.string(),
    value: v.any(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);

    const defaultSetting = DEFAULT_SETTINGS[args.key as keyof typeof DEFAULT_SETTINGS];
    if (!defaultSetting) {
      throw Errors.validation(`Unknown setting: ${args.key}`);
    }

    // Check if setting already exists
    const existingSetting = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    const now = Date.now();
    const valueJson = JSON.stringify(args.value);

    if (existingSetting) {
      await ctx.db.patch(existingSetting._id, {
        value: valueJson,
        updatedAt: now,
        updatedBy: userId,
      });
    } else {
      await ctx.db.insert("appSettings", {
        key: args.key,
        value: valueJson,
        description: defaultSetting.description,
        category: defaultSetting.category,
        updatedAt: now,
        updatedBy: userId,
      });
    }

    return { success: true };
  },
});

// Reset a setting to default (admin only)
export const resetSetting = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);

    const existingSetting = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existingSetting) {
      await ctx.db.delete(existingSetting._id);
    }

    return { success: true };
  },
});

// Initialize all default settings (admin only, run once)
export const initializeDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAdmin(ctx);

    const now = Date.now();
    let created = 0;

    for (const [key, config] of Object.entries(DEFAULT_SETTINGS)) {
      const existing = await ctx.db
        .query("appSettings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();

      if (!existing) {
        await ctx.db.insert("appSettings", {
          key,
          value: JSON.stringify(config.value),
          description: config.description,
          category: config.category,
          updatedAt: now,
          updatedBy: userId,
        });
        created++;
      }
    }

    return { success: true, created };
  },
});

// ============================================
// ADMIN STATS
// ============================================

// Get system statistics for admin dashboard
export const getSystemStats = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAdmin(ctx);

    // Count users by role
    const allUsers = await ctx.db.query("users").collect();
    const owners = allUsers.filter(u => u.role === "owner");
    const mechanics = allUsers.filter(u => u.role === "mechanic");
    const admins = allUsers.filter(u => u.role === "admin");

    // Count vessels
    const vessels = await ctx.db.query("vessels").collect();

    // Count work orders by status
    const workOrders = await ctx.db.query("workOrders").collect();
    const workOrdersByStatus = {
      quote_requested: workOrders.filter(wo => wo.status === "quote_requested").length,
      quoted: workOrders.filter(wo => wo.status === "quoted").length,
      in_progress: workOrders.filter(wo => wo.status === "in_progress").length,
      completed: workOrders.filter(wo => wo.status === "completed").length,
      cancelled: workOrders.filter(wo => wo.status === "cancelled").length,
      declined: workOrders.filter(wo => wo.status === "declined").length,
    };

    // Recent activity (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentUsers = allUsers.filter(u => u._creationTime > sevenDaysAgo).length;
    const recentWorkOrders = workOrders.filter(wo => wo.startedAt > sevenDaysAgo).length;

    return {
      users: {
        total: allUsers.length,
        owners: owners.length,
        mechanics: mechanics.length,
        admins: admins.length,
        recentSignups: recentUsers,
      },
      vessels: {
        total: vessels.length,
      },
      workOrders: {
        total: workOrders.length,
        byStatus: workOrdersByStatus,
        recentCreated: recentWorkOrders,
      },
    };
  },
});

// Get recent activity feed for admin dashboard
export const getRecentActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);

    const limit = args.limit || 20;
    const activities: {
      id: string;
      type: "user_signup" | "vessel_added" | "work_order_created" | "work_order_completed" | "rating_submitted" | "access_request";
      title: string;
      description: string;
      timestamp: number;
      metadata?: Record<string, unknown>;
    }[] = [];

    // Get recent users (signups)
    const recentUsers = await ctx.db
      .query("users")
      .order("desc")
      .take(limit);
    
    for (const u of recentUsers) {
      activities.push({
        id: `user-${u._id}`,
        type: "user_signup",
        title: "New User Signup",
        description: `${u.name || u.email || "Unknown"} joined as ${u.role || "user"}`,
        timestamp: u._creationTime,
        metadata: { userId: u._id, role: u.role },
      });
    }

    // Get recent vessels
    const recentVessels = await ctx.db
      .query("vessels")
      .order("desc")
      .take(limit);
    
    for (const v of recentVessels) {
      const owner = await ctx.db.get(v.ownerId);
      activities.push({
        id: `vessel-${v._id}`,
        type: "vessel_added",
        title: "Vessel Added",
        description: `${v.name} (${v.year} ${v.make} ${v.model}) added by ${owner?.name || "Unknown"}`,
        timestamp: v._creationTime,
        metadata: { vesselId: v._id, ownerId: v.ownerId },
      });
    }

    // Get recent work orders
    const recentWorkOrders = await ctx.db
      .query("workOrders")
      .order("desc")
      .take(limit);
    
    for (const wo of recentWorkOrders) {
      const vessel = await ctx.db.get(wo.vesselId);
      const mechanic = await ctx.db.get(wo.mechanicId);
      
      // Work order created
      activities.push({
        id: `wo-created-${wo._id}`,
        type: "work_order_created",
        title: "Work Order Created",
        description: `${wo.description.substring(0, 50)}${wo.description.length > 50 ? "..." : ""} for ${vessel?.name || "Unknown vessel"}`,
        timestamp: wo.startedAt,
        metadata: { workOrderId: wo._id, vesselId: wo.vesselId, status: wo.status },
      });

      // Work order completed
      if (wo.status === "completed" && wo.completedAt) {
        activities.push({
          id: `wo-completed-${wo._id}`,
          type: "work_order_completed",
          title: "Work Order Completed",
          description: `${mechanic?.companyName || mechanic?.name || "Mechanic"} completed work on ${vessel?.name || "Unknown vessel"}`,
          timestamp: wo.completedAt,
          metadata: { workOrderId: wo._id, mechanicId: wo.mechanicId },
        });
      }
    }

    // Get recent ratings
    const recentMechanicRatings = await ctx.db
      .query("mechanicRatings")
      .order("desc")
      .take(limit);
    
    for (const rating of recentMechanicRatings) {
      const mechanic = await ctx.db.get(rating.mechanicId);
      activities.push({
        id: `rating-mechanic-${rating._id}`,
        type: "rating_submitted",
        title: "Mechanic Rating Submitted",
        description: `${mechanic?.companyName || mechanic?.name || "Mechanic"} received ${rating.overallRating.toFixed(1)} wrench rating`,
        timestamp: rating.createdAt,
        metadata: { ratingId: rating._id, mechanicId: rating.mechanicId, rating: rating.overallRating },
      });
    }

    const recentOwnerRatings = await ctx.db
      .query("ownerRatings")
      .order("desc")
      .take(limit);
    
    for (const rating of recentOwnerRatings) {
      const owner = await ctx.db.get(rating.ownerId);
      activities.push({
        id: `rating-owner-${rating._id}`,
        type: "rating_submitted",
        title: "Owner Rating Submitted",
        description: `${owner?.name || "Owner"} received ${rating.overallRating.toFixed(1)} star rating`,
        timestamp: rating.createdAt,
        metadata: { ratingId: rating._id, ownerId: rating.ownerId, rating: rating.overallRating },
      });
    }

    // Get recent access requests
    const recentAccessRequests = await ctx.db
      .query("accessRequests")
      .order("desc")
      .take(limit);
    
    for (const req of recentAccessRequests) {
      const mechanic = await ctx.db.get(req.mechanicId);
      const vessel = await ctx.db.get(req.vesselId);
      activities.push({
        id: `access-${req._id}`,
        type: "access_request",
        title: `Access Request ${req.status.charAt(0).toUpperCase() + req.status.slice(1)}`,
        description: `${mechanic?.companyName || mechanic?.name || "Mechanic"} requested access to ${vessel?.name || "Unknown vessel"}`,
        timestamp: req.requestedAt,
        metadata: { requestId: req._id, status: req.status },
      });
    }

    // Sort all activities by timestamp (most recent first) and limit
    activities.sort((a, b) => b.timestamp - a.timestamp);
    
    return activities.slice(0, limit);
  },
});
