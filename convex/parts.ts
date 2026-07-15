import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthenticatedUser, requireAuth } from "./lib/auth";
import { Errors } from "./lib/errors";

// Part categories for the parts database
export const PART_CATEGORIES = [
  "engine",
  "electrical",
  "plumbing",
  "fuel",
  "cooling",
  "steering",
  "hvac",
  "safety",
  "general",
] as const;

export type PartCategory = typeof PART_CATEGORIES[number];

// ============================================
// QUERIES
// ============================================

// Search parts in the database with full-text search
export const searchParts = query({
  args: {
    searchQuery: v.string(),
    manufacturer: v.optional(v.string()),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    if (!args.searchQuery || args.searchQuery.trim().length === 0) {
      // If no search query, return popular parts
      return await ctx.db
        .query("partsDatabase")
        .withIndex("by_usage")
        .order("desc")
        .take(limit);
    }

    // Build filter for search index
    let searchResults = await ctx.db
      .query("partsDatabase")
      .withSearchIndex("search_parts", (q) => {
        let search = q.search("name", args.searchQuery);
        if (args.manufacturer) {
          search = search.eq("manufacturer", args.manufacturer);
        }
        if (args.category) {
          search = search.eq("category", args.category as PartCategory);
        }
        return search;
      })
      .take(limit);

    return searchResults;
  },
});

// Get recently used parts by mechanic (last 20)
export const getRecentParts = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];
    const userId = user._id;

    const limit = args.limit || 20;

    // Get mechanic's recent work orders
    const recentWorkOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_mechanic", (q) => q.eq("mechanicId", userId))
      .order("desc")
      .take(50);

    if (recentWorkOrders.length === 0) return [];

    // Collect parts from these work orders
    const partsMap = new Map<string, {
      name: string;
      partNumber: string | undefined;
      manufacturer: string | undefined;
      category: string | undefined;
      lastUsed: number;
      count: number;
    }>();

    for (const wo of recentWorkOrders) {
      const parts = await ctx.db
        .query("workOrderParts")
        .withIndex("by_work_order", (q) => q.eq("workOrderId", wo._id))
        .collect();

      for (const part of parts) {
        const key = `${part.name}-${part.partNumber || ""}-${part.manufacturer || ""}`;
        const existing = partsMap.get(key);
        
        if (!existing) {
          partsMap.set(key, {
            name: part.name,
            partNumber: part.partNumber,
            manufacturer: part.manufacturer,
            category: part.category,
            lastUsed: wo.startedAt,
            count: part.quantity,
          });
        } else {
          existing.count += part.quantity;
          if (wo.startedAt > existing.lastUsed) {
            existing.lastUsed = wo.startedAt;
          }
        }
      }
    }

    // Sort by most recently used and take limit
    return Array.from(partsMap.values())
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, limit);
  },
});

// Get parts previously used on a specific vessel
export const getVesselPartHistory = query({
  args: {
    vesselId: v.id("vessels"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];
    const userId = user._id;

    const limit = args.limit || 20;

    // Get work orders for this vessel
    const vesselWorkOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_vessel", (q) => q.eq("vesselId", args.vesselId))
      .order("desc")
      .collect();

    if (vesselWorkOrders.length === 0) return [];

    // Collect parts with usage info
    const partsMap = new Map<string, {
      name: string;
      partNumber: string | undefined;
      manufacturer: string | undefined;
      category: string | undefined;
      lastUsed: number;
      timesUsed: number;
      totalQuantity: number;
    }>();

    for (const wo of vesselWorkOrders) {
      const parts = await ctx.db
        .query("workOrderParts")
        .withIndex("by_work_order", (q) => q.eq("workOrderId", wo._id))
        .collect();

      for (const part of parts) {
        const key = `${part.name}-${part.partNumber || ""}-${part.manufacturer || ""}`;
        const existing = partsMap.get(key);
        
        if (!existing) {
          partsMap.set(key, {
            name: part.name,
            partNumber: part.partNumber,
            manufacturer: part.manufacturer,
            category: part.category,
            lastUsed: wo.startedAt,
            timesUsed: 1,
            totalQuantity: part.quantity,
          });
        } else {
          existing.timesUsed++;
          existing.totalQuantity += part.quantity;
          if (wo.startedAt > existing.lastUsed) {
            existing.lastUsed = wo.startedAt;
          }
        }
      }
    }

    // Sort by most recently used
    return Array.from(partsMap.values())
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, limit);
  },
});

// Get list of manufacturers for dropdown
export const getManufacturers = query({
  args: {},
  handler: async (ctx) => {
    const parts = await ctx.db
      .query("partsDatabase")
      .collect();

    // Get unique manufacturers sorted by usage
    const manufacturerCounts = new Map<string, number>();
    for (const part of parts) {
      const count = manufacturerCounts.get(part.manufacturer) || 0;
      manufacturerCounts.set(part.manufacturer, count + part.usageCount);
    }

    return Array.from(manufacturerCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  },
});

// Get part categories
export const getCategories = query({
  args: {},
  handler: async () => {
    return PART_CATEGORIES.map(cat => ({
      id: cat,
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
    }));
  },
});

// Get popular parts (for suggestions when no search)
export const getPopularParts = query({
  args: {
    limit: v.optional(v.number()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    if (args.category) {
      return await ctx.db
        .query("partsDatabase")
        .withIndex("by_category", (q) => q.eq("category", args.category as PartCategory))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("partsDatabase")
      .withIndex("by_usage")
      .order("desc")
      .take(limit);
  },
});

// ============================================
// MUTATIONS
// ============================================

// Add a new part to the catalog (called when mechanic enters a new part)
export const addPartToCatalog = mutation({
  args: {
    partNumber: v.string(),
    name: v.string(),
    manufacturer: v.string(),
    category: v.string(),
    description: v.optional(v.string()),
    averagePrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Check if part already exists
    const existing = await ctx.db
      .query("partsDatabase")
      .withIndex("by_partNumber", (q) => q.eq("partNumber", args.partNumber))
      .first();

    if (existing) {
      // Part exists, just return it
      return existing._id;
    }

    // Create new part in catalog
    const partId = await ctx.db.insert("partsDatabase", {
      partNumber: args.partNumber,
      name: args.name,
      manufacturer: args.manufacturer,
      category: args.category as PartCategory,
      description: args.description,
      averagePrice: args.averagePrice,
      isSeeded: false,
      usageCount: 0,
      createdAt: Date.now(),
    });

    return partId;
  },
});

// Increment usage count for a part (called when part is added to work order)
export const incrementUsageCount = mutation({
  args: {
    partNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const part = await ctx.db
      .query("partsDatabase")
      .withIndex("by_partNumber", (q) => q.eq("partNumber", args.partNumber))
      .first();

    if (part) {
      await ctx.db.patch(part._id, {
        usageCount: part.usageCount + 1,
      });
    }
  },
});

// Check if database has been seeded
export const isSeeded = query({
  args: {},
  handler: async (ctx) => {
    const seededPart = await ctx.db
      .query("partsDatabase")
      .filter((q) => q.eq(q.field("isSeeded"), true))
      .first();
    
    return seededPart !== null;
  },
});
