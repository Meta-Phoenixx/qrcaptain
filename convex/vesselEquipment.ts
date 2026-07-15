import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthenticatedUser, requireAuth } from "./lib/auth";
import { Errors } from "./lib/errors";
import { getFileUrl } from "./lib/fileStorage";

// Equipment category type for validation
const equipmentCategoryValidator = v.union(
  v.literal("propulsion"),
  v.literal("electrical"),
  v.literal("electronics"),
  v.literal("plumbing"),
  v.literal("fuel"),
  v.literal("hvac"),
  v.literal("deck"),
  v.literal("safety"),
  v.literal("steering"),
  v.literal("hull"),
  v.literal("canvas"),
  v.literal("galley"),
  v.literal("entertainment"),
  v.literal("rigging"),
  v.literal("tender")
);

// Helper to check vessel access
async function checkVesselAccess(ctx: any, vesselId: any, userId: any) {
  const vessel = await ctx.db.get(vesselId);
  if (!vessel) return null;

  const user = await ctx.db.get(userId);
  if (!user) return null;

  // Admins have full access
  if (user.role === "admin") return vessel;

  // Owners can access their own vessels
  if (user.role === "owner" && vessel.ownerId === userId) return vessel;

  // Mechanics can access authorized vessels
  if (user.role === "mechanic") {
    const auth = await ctx.db
      .query("mechanicAuthorizations")
      .withIndex("by_vessel_mechanic", (q: any) =>
        q.eq("vesselId", vesselId).eq("mechanicId", userId)
      )
      .filter((q: any) => q.eq(q.field("isActive"), true))
      .first();

    if (auth) return vessel;
  }

  return null;
}

// List all equipment for a vessel
export const listByVessel = query({
  args: { vesselId: v.id("vessels") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];
    const userId = user._id;

    const vessel = await checkVesselAccess(ctx, args.vesselId, userId);
    if (!vessel) return [];

    const equipment = await ctx.db
      .query("vesselEquipment")
      .withIndex("by_vessel", (q) => q.eq("vesselId", args.vesselId))
      .collect();

    // Add image URLs for equipment with photos
    const equipmentWithImages = await Promise.all(
      equipment.map(async (item) => ({
        ...item,
        imageUrl: await getFileUrl(ctx, item.imageStorageId),
      }))
    );

    return equipmentWithImages;
  },
});

// List equipment by category for a vessel
export const listByCategory = query({
  args: {
    vesselId: v.id("vessels"),
    category: equipmentCategoryValidator,
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];
    const userId = user._id;

    const vessel = await checkVesselAccess(ctx, args.vesselId, userId);
    if (!vessel) return [];

    const equipment = await ctx.db
      .query("vesselEquipment")
      .withIndex("by_vessel_category", (q) =>
        q.eq("vesselId", args.vesselId).eq("category", args.category)
      )
      .collect();

    // Add image URLs
    const equipmentWithImages = await Promise.all(
      equipment.map(async (item) => ({
        ...item,
        imageUrl: await getFileUrl(ctx, item.imageStorageId),
      }))
    );

    return equipmentWithImages;
  },
});

// Get equipment counts by category for a vessel
export const getCategoryCounts = query({
  args: { vesselId: v.id("vessels") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return {};
    const userId = user._id;

    const vessel = await checkVesselAccess(ctx, args.vesselId, userId);
    if (!vessel) return {};

    const equipment = await ctx.db
      .query("vesselEquipment")
      .withIndex("by_vessel", (q) => q.eq("vesselId", args.vesselId))
      .collect();

    // Count items by category
    const counts: Record<string, number> = {};
    for (const item of equipment) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }

    return counts;
  },
});

// Get a single equipment item
export const getEquipment = query({
  args: { equipmentId: v.id("vesselEquipment") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return null;
    const userId = user._id;

    const equipment = await ctx.db.get(args.equipmentId);
    if (!equipment) return null;

    const vessel = await checkVesselAccess(ctx, equipment.vesselId, userId);
    if (!vessel) return null;

    return {
      ...equipment,
      imageUrl: await getFileUrl(ctx, equipment.imageStorageId),
    };
  },
});

// Condition status validator
const conditionStatusValidator = v.optional(
  v.union(
    v.literal("good"),
    v.literal("fair"),
    v.literal("needs_attention")
  )
);

// Consumable part number validator
const consumablePartValidator = v.optional(
  v.array(
    v.object({
      name: v.string(),
      partNumber: v.string(),
      manufacturer: v.optional(v.string()),
      notes: v.optional(v.string()),
    })
  )
);

// Create new equipment item
export const createEquipment = mutation({
  args: {
    vesselId: v.id("vessels"),
    category: equipmentCategoryValidator,
    name: v.string(),
    manufacturer: v.optional(v.string()),
    model: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    
    // Installation & Purchase
    installationDate: v.optional(v.number()),
    yearInstalled: v.optional(v.number()),
    purchaseDate: v.optional(v.number()),
    
    // Warranty
    warrantyExpiry: v.optional(v.number()),
    warrantyTerms: v.optional(v.string()),
    
    // Service Tracking - Date based
    lastServiceDate: v.optional(v.number()),
    nextServiceDate: v.optional(v.number()),
    serviceIntervalDays: v.optional(v.number()),
    
    // Service Tracking - Hours based
    hoursAtInstall: v.optional(v.number()),
    currentHours: v.optional(v.number()),
    lastServiceHours: v.optional(v.number()),
    serviceIntervalHours: v.optional(v.number()),
    
    // Condition Status
    conditionStatus: conditionStatusValidator,
    
    // Consumables & Parts
    consumablePartNumbers: consumablePartValidator,
    
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);

    const vessel = await checkVesselAccess(ctx, args.vesselId, userId);
    if (!vessel) throw Errors.notFound("Vessel");

    // Only owners and admins can add equipment
    if (user.role !== "owner" && user.role !== "admin") {
      throw Errors.accessDenied();
    }

    const equipmentId = await ctx.db.insert("vesselEquipment", {
      vesselId: args.vesselId,
      category: args.category,
      name: args.name,
      manufacturer: args.manufacturer,
      model: args.model,
      serialNumber: args.serialNumber,
      installationDate: args.installationDate,
      yearInstalled: args.yearInstalled,
      purchaseDate: args.purchaseDate,
      warrantyExpiry: args.warrantyExpiry,
      warrantyTerms: args.warrantyTerms,
      lastServiceDate: args.lastServiceDate,
      nextServiceDate: args.nextServiceDate,
      serviceIntervalDays: args.serviceIntervalDays,
      hoursAtInstall: args.hoursAtInstall,
      currentHours: args.currentHours,
      lastServiceHours: args.lastServiceHours,
      serviceIntervalHours: args.serviceIntervalHours,
      conditionStatus: args.conditionStatus,
      consumablePartNumbers: args.consumablePartNumbers,
      notes: args.notes,
    });

    return { equipmentId };
  },
});

// Update equipment item
export const updateEquipment = mutation({
  args: {
    equipmentId: v.id("vesselEquipment"),
    name: v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    model: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    
    // Installation & Purchase
    installationDate: v.optional(v.number()),
    yearInstalled: v.optional(v.number()),
    purchaseDate: v.optional(v.number()),
    
    // Warranty
    warrantyExpiry: v.optional(v.number()),
    warrantyTerms: v.optional(v.string()),
    
    // Service Tracking - Date based
    lastServiceDate: v.optional(v.number()),
    nextServiceDate: v.optional(v.number()),
    serviceIntervalDays: v.optional(v.number()),
    
    // Service Tracking - Hours based
    hoursAtInstall: v.optional(v.number()),
    currentHours: v.optional(v.number()),
    lastServiceHours: v.optional(v.number()),
    serviceIntervalHours: v.optional(v.number()),
    
    // Condition Status
    conditionStatus: conditionStatusValidator,
    
    // Consumables & Parts
    consumablePartNumbers: consumablePartValidator,
    
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);

    const equipment = await ctx.db.get(args.equipmentId);
    if (!equipment) throw Errors.notFound("Equipment");

    const vessel = await checkVesselAccess(ctx, equipment.vesselId, userId);
    if (!vessel) throw Errors.accessDenied();

    // Only owners and admins can update equipment
    if (user.role !== "owner" && user.role !== "admin") {
      throw Errors.accessDenied();
    }

    const { equipmentId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(equipmentId, filteredUpdates);
    return { success: true };
  },
});

// Delete equipment item
export const deleteEquipment = mutation({
  args: { equipmentId: v.id("vesselEquipment") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);

    const equipment = await ctx.db.get(args.equipmentId);
    if (!equipment) throw Errors.notFound("Equipment");

    const vessel = await checkVesselAccess(ctx, equipment.vesselId, userId);
    if (!vessel) throw Errors.accessDenied();

    // Only owners and admins can delete equipment
    if (user.role !== "owner" && user.role !== "admin") {
      throw Errors.accessDenied();
    }

    await ctx.db.delete(args.equipmentId);
    return { success: true };
  },
});

// Save equipment image
export const saveEquipmentImage = mutation({
  args: {
    equipmentId: v.id("vesselEquipment"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const equipment = await ctx.db.get(args.equipmentId);
    if (!equipment) throw Errors.notFound("Equipment");

    const vessel = await checkVesselAccess(ctx, equipment.vesselId, userId);
    if (!vessel) throw Errors.accessDenied();

    await ctx.db.patch(args.equipmentId, {
      imageStorageId: args.storageId,
    });

    return { success: true };
  },
});

// Search equipment across a vessel
export const searchEquipment = query({
  args: {
    vesselId: v.id("vessels"),
    searchQuery: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];
    const userId = user._id;

    const vessel = await checkVesselAccess(ctx, args.vesselId, userId);
    if (!vessel) return [];

    const equipment = await ctx.db
      .query("vesselEquipment")
      .withIndex("by_vessel", (q) => q.eq("vesselId", args.vesselId))
      .collect();

    const query = args.searchQuery.toLowerCase();

    // Filter by name, manufacturer, model, or serial number
    const filtered = equipment.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.manufacturer?.toLowerCase().includes(query) ||
        item.model?.toLowerCase().includes(query) ||
        item.serialNumber?.toLowerCase().includes(query)
    );

    // Add image URLs
    const filteredWithImages = await Promise.all(
      filtered.map(async (item) => ({
        ...item,
        imageUrl: await getFileUrl(ctx, item.imageStorageId),
      }))
    );

    return filteredWithImages;
  },
});

// Get equipment needing maintenance (based on service interval)
export const getMaintenanceDue = query({
  args: { vesselId: v.id("vessels") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];
    const userId = user._id;

    const vessel = await checkVesselAccess(ctx, args.vesselId, userId);
    if (!vessel) return [];

    const equipment = await ctx.db
      .query("vesselEquipment")
      .withIndex("by_vessel", (q) => q.eq("vesselId", args.vesselId))
      .collect();

    const now = Date.now();
    const dueSoon: typeof equipment = [];

    for (const item of equipment) {
      if (item.lastServiceDate && item.serviceIntervalDays) {
        const nextServiceDate =
          item.lastServiceDate + item.serviceIntervalDays * 24 * 60 * 60 * 1000;
        // Due within 30 days
        if (nextServiceDate - now < 30 * 24 * 60 * 60 * 1000) {
          dueSoon.push(item);
        }
      }
    }

    return dueSoon;
  },
});

// Get upcoming service items across all owner's vessels (for landing page reminders)
export const getUpcomingServiceItems = query({
  args: {
    daysAhead: v.optional(v.number()), // Default 30 days
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user || user.role !== "owner") return [];
    const userId = user._id;

    const daysAhead = args.daysAhead || 30;
    const now = Date.now();
    const futureLimit = now + daysAhead * 24 * 60 * 60 * 1000;

    // Get all owner's vessels
    const vessels = await ctx.db
      .query("vessels")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    if (vessels.length === 0) return [];

    const upcomingItems: Array<{
      equipment: any;
      vessel: any;
      dueDate: number;
      daysUntilDue: number;
      urgency: "overdue" | "urgent" | "soon" | "upcoming";
      type: "service" | "warranty";
    }> = [];

    for (const vessel of vessels) {
      const equipment = await ctx.db
        .query("vesselEquipment")
        .withIndex("by_vessel", (q) => q.eq("vesselId", vessel._id))
        .collect();

      for (const item of equipment) {
        // Check for upcoming service based on nextServiceDate
        if (item.nextServiceDate) {
          const daysUntilDue = Math.ceil(
            (item.nextServiceDate - now) / (24 * 60 * 60 * 1000)
          );

          if (item.nextServiceDate <= futureLimit) {
            let urgency: "overdue" | "urgent" | "soon" | "upcoming";
            if (daysUntilDue < 0) {
              urgency = "overdue";
            } else if (daysUntilDue <= 7) {
              urgency = "urgent";
            } else if (daysUntilDue <= 14) {
              urgency = "soon";
            } else {
              urgency = "upcoming";
            }

            upcomingItems.push({
              equipment: {
                _id: item._id,
                name: item.name,
                category: item.category,
                manufacturer: item.manufacturer,
                model: item.model,
              },
              vessel: {
                _id: vessel._id,
                name: vessel.name,
              },
              dueDate: item.nextServiceDate,
              daysUntilDue,
              urgency,
              type: "service",
            });
          }
        }

        // Check for calculated service date based on last service + interval
        if (item.lastServiceDate && item.serviceIntervalDays && !item.nextServiceDate) {
          const calculatedDueDate =
            item.lastServiceDate + item.serviceIntervalDays * 24 * 60 * 60 * 1000;
          const daysUntilDue = Math.ceil(
            (calculatedDueDate - now) / (24 * 60 * 60 * 1000)
          );

          if (calculatedDueDate <= futureLimit) {
            let urgency: "overdue" | "urgent" | "soon" | "upcoming";
            if (daysUntilDue < 0) {
              urgency = "overdue";
            } else if (daysUntilDue <= 7) {
              urgency = "urgent";
            } else if (daysUntilDue <= 14) {
              urgency = "soon";
            } else {
              urgency = "upcoming";
            }

            upcomingItems.push({
              equipment: {
                _id: item._id,
                name: item.name,
                category: item.category,
                manufacturer: item.manufacturer,
                model: item.model,
              },
              vessel: {
                _id: vessel._id,
                name: vessel.name,
              },
              dueDate: calculatedDueDate,
              daysUntilDue,
              urgency,
              type: "service",
            });
          }
        }

        // Check for warranty expiration
        if (item.warrantyExpiry && item.warrantyExpiry <= futureLimit) {
          const daysUntilExpiry = Math.ceil(
            (item.warrantyExpiry - now) / (24 * 60 * 60 * 1000)
          );

          if (daysUntilExpiry >= 0) {
            let urgency: "overdue" | "urgent" | "soon" | "upcoming";
            if (daysUntilExpiry <= 7) {
              urgency = "urgent";
            } else if (daysUntilExpiry <= 14) {
              urgency = "soon";
            } else {
              urgency = "upcoming";
            }

            upcomingItems.push({
              equipment: {
                _id: item._id,
                name: item.name,
                category: item.category,
                manufacturer: item.manufacturer,
                model: item.model,
              },
              vessel: {
                _id: vessel._id,
                name: vessel.name,
              },
              dueDate: item.warrantyExpiry,
              daysUntilDue: daysUntilExpiry,
              urgency,
              type: "warranty",
            });
          }
        }
      }
    }

    // Sort by urgency (overdue first, then by days until due)
    const urgencyOrder = { overdue: 0, urgent: 1, soon: 2, upcoming: 3 };
    upcomingItems.sort((a, b) => {
      const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      return a.daysUntilDue - b.daysUntilDue;
    });

    return upcomingItems;
  },
});
