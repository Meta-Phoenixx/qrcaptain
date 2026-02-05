import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Get owner's preferred mechanics list
export const getPreferredMechanics = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") return [];

    // Get preferred mechanics
    const preferredList = await ctx.db
      .query("preferredMechanics")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    // Get owner's vessels for authorization info
    const vessels = await ctx.db
      .query("vessels")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    // Enrich with mechanic info and vessel access
    const enriched = await Promise.all(
      preferredList.map(async (preferred) => {
        const mechanic = await ctx.db.get(preferred.mechanicId);
        if (!mechanic) return null;

        // Get metrics
        const metrics = await ctx.db
          .query("mechanicMetrics")
          .withIndex("by_mechanic", (q) => q.eq("mechanicId", preferred.mechanicId))
          .first();

        // Get image URL
        let imageUrl = null;
        if (mechanic.companyLogoStorageId) {
          imageUrl = await ctx.storage.getUrl(mechanic.companyLogoStorageId);
        } else if (mechanic.profilePhotoStorageId) {
          imageUrl = await ctx.storage.getUrl(mechanic.profilePhotoStorageId);
        }

        // Get vessel authorizations for this mechanic
        const authorizations = await Promise.all(
          vessels.map(async (vessel) => {
            const auth = await ctx.db
              .query("mechanicAuthorizations")
              .withIndex("by_vessel_mechanic", (q) =>
                q.eq("vesselId", vessel._id).eq("mechanicId", preferred.mechanicId)
              )
              .first();
            return {
              vesselId: vessel._id,
              vesselName: vessel.name,
              isAuthorized: auth?.isActive || false,
            };
          })
        );

        return {
          _id: preferred._id,
          mechanicId: mechanic._id,
          companyName: mechanic.companyName,
          fullName: mechanic.fullName,
          phone: mechanic.phone,
          email: mechanic.email,
          imageUrl,
          availabilityStatus: mechanic.availabilityStatus || "available",
          avgOverallRating: metrics?.avgOverallRating || null,
          totalRatings: metrics?.totalRatings || 0,
          notes: preferred.notes,
          addedAt: preferred.addedAt,
          vesselAuthorizations: authorizations,
        };
      })
    );

    return enriched.filter(Boolean);
  },
});

// Add mechanic to preferred list
export const addToPreferredList = mutation({
  args: {
    mechanicId: v.id("users"),
    vesselIds: v.optional(v.array(v.id("vessels"))), // Vessels to authorize
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") {
      throw new Error("Only owners can add preferred mechanics");
    }

    // Verify mechanic exists
    const mechanic = await ctx.db.get(args.mechanicId);
    if (!mechanic || mechanic.role !== "mechanic") {
      throw new Error("Invalid mechanic");
    }

    // Check if already in preferred list
    const existing = await ctx.db
      .query("preferredMechanics")
      .withIndex("by_owner_mechanic", (q) =>
        q.eq("ownerId", userId).eq("mechanicId", args.mechanicId)
      )
      .first();

    if (existing) {
      throw new Error("Mechanic is already in your preferred list");
    }

    // Add to preferred list
    const preferredId = await ctx.db.insert("preferredMechanics", {
      ownerId: userId,
      mechanicId: args.mechanicId,
      addedAt: Date.now(),
      notes: args.notes,
    });

    // Authorize for specified vessels
    if (args.vesselIds && args.vesselIds.length > 0) {
      for (const vesselId of args.vesselIds) {
        const vessel = await ctx.db.get(vesselId);
        if (!vessel || vessel.ownerId !== userId) continue;

        // Check if authorization exists
        const existingAuth = await ctx.db
          .query("mechanicAuthorizations")
          .withIndex("by_vessel_mechanic", (q) =>
            q.eq("vesselId", vesselId).eq("mechanicId", args.mechanicId)
          )
          .first();

        if (existingAuth) {
          // Update existing authorization
          await ctx.db.patch(existingAuth._id, {
            isActive: true,
            authorizedAt: Date.now(),
            authorizedBy: userId,
          });
        } else {
          // Create new authorization
          await ctx.db.insert("mechanicAuthorizations", {
            vesselId,
            mechanicId: args.mechanicId,
            authorizedAt: Date.now(),
            authorizedBy: userId,
            isActive: true,
          });
        }
      }
    }

    // Notify mechanic they've been added to preferred list
    // Include QR code info for authorized vessels
    const authorizedVessels = args.vesselIds 
      ? await Promise.all(args.vesselIds.map(id => ctx.db.get(id)))
      : [];
    const vesselNames = authorizedVessels
      .filter(Boolean)
      .map(v => v!.name)
      .join(", ");

    await ctx.db.insert("notifications", {
      userId: args.mechanicId,
      type: "added_to_preferred_list",
      title: "Added to Preferred Mechanics",
      message: `${user.fullName || "An owner"} has added you to their preferred mechanics list${vesselNames ? ` and authorized you for: ${vesselNames}` : ""}`,
      relatedId: preferredId,
      relatedType: "preferredMechanic",
      isRead: false,
      createdAt: Date.now(),
    });

    return { preferredId };
  },
});

// Remove mechanic from preferred list
export const removeFromPreferredList = mutation({
  args: {
    mechanicId: v.id("users"),
    revokeVesselAccess: v.optional(v.boolean()), // Also revoke vessel authorizations
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") {
      throw new Error("Only owners can manage their preferred list");
    }

    // Find the preferred record
    const preferred = await ctx.db
      .query("preferredMechanics")
      .withIndex("by_owner_mechanic", (q) =>
        q.eq("ownerId", userId).eq("mechanicId", args.mechanicId)
      )
      .first();

    if (!preferred) {
      throw new Error("Mechanic is not in your preferred list");
    }

    // Delete the preferred record
    await ctx.db.delete(preferred._id);

    // Optionally revoke vessel access
    if (args.revokeVesselAccess) {
      const vessels = await ctx.db
        .query("vessels")
        .withIndex("by_owner", (q) => q.eq("ownerId", userId))
        .collect();

      for (const vessel of vessels) {
        const auth = await ctx.db
          .query("mechanicAuthorizations")
          .withIndex("by_vessel_mechanic", (q) =>
            q.eq("vesselId", vessel._id).eq("mechanicId", args.mechanicId)
          )
          .first();

        if (auth && auth.isActive) {
          await ctx.db.patch(auth._id, { isActive: false });
        }
      }
    }

    return { success: true };
  },
});

// Update notes for a preferred mechanic
export const updatePreferredMechanicNotes = mutation({
  args: {
    mechanicId: v.id("users"),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") {
      throw new Error("Only owners can update notes");
    }

    const preferred = await ctx.db
      .query("preferredMechanics")
      .withIndex("by_owner_mechanic", (q) =>
        q.eq("ownerId", userId).eq("mechanicId", args.mechanicId)
      )
      .first();

    if (!preferred) {
      throw new Error("Mechanic is not in your preferred list");
    }

    await ctx.db.patch(preferred._id, { notes: args.notes });
    return { success: true };
  },
});

// Update vessel authorizations for a preferred mechanic
export const updatePreferredMechanicVessels = mutation({
  args: {
    mechanicId: v.id("users"),
    vesselIds: v.array(v.id("vessels")), // New list of authorized vessels
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") {
      throw new Error("Only owners can update vessel authorizations");
    }

    // Verify mechanic is in preferred list
    const preferred = await ctx.db
      .query("preferredMechanics")
      .withIndex("by_owner_mechanic", (q) =>
        q.eq("ownerId", userId).eq("mechanicId", args.mechanicId)
      )
      .first();

    if (!preferred) {
      throw new Error("Mechanic is not in your preferred list");
    }

    // Get all owner's vessels
    const vessels = await ctx.db
      .query("vessels")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    // Update authorizations
    for (const vessel of vessels) {
      const shouldBeAuthorized = args.vesselIds.includes(vessel._id);

      const existingAuth = await ctx.db
        .query("mechanicAuthorizations")
        .withIndex("by_vessel_mechanic", (q) =>
          q.eq("vesselId", vessel._id).eq("mechanicId", args.mechanicId)
        )
        .first();

      if (existingAuth) {
        if (existingAuth.isActive !== shouldBeAuthorized) {
          await ctx.db.patch(existingAuth._id, {
            isActive: shouldBeAuthorized,
            authorizedAt: shouldBeAuthorized ? Date.now() : existingAuth.authorizedAt,
            authorizedBy: userId,
          });
        }
      } else if (shouldBeAuthorized) {
        await ctx.db.insert("mechanicAuthorizations", {
          vesselId: vessel._id,
          mechanicId: args.mechanicId,
          authorizedAt: Date.now(),
          authorizedBy: userId,
          isActive: true,
        });
      }
    }

    return { success: true };
  },
});

// Check if a mechanic is in the owner's preferred list
export const isPreferredMechanic = query({
  args: { mechanicId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") return false;

    const preferred = await ctx.db
      .query("preferredMechanics")
      .withIndex("by_owner_mechanic", (q) =>
        q.eq("ownerId", userId).eq("mechanicId", args.mechanicId)
      )
      .first();

    return !!preferred;
  },
});

// Get mechanics who have this owner in their customer list (reverse lookup)
export const getMechanicsWithAccess = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") return [];

    // Get all vessels owned by this user
    const vessels = await ctx.db
      .query("vessels")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    // Get all mechanics with active authorization to any of the owner's vessels
    const mechanicIds = new Set<string>();
    
    for (const vessel of vessels) {
      const auths = await ctx.db
        .query("mechanicAuthorizations")
        .withIndex("by_vessel", (q) => q.eq("vesselId", vessel._id))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      for (const auth of auths) {
        mechanicIds.add(auth.mechanicId);
      }
    }

    // Check which are in preferred list
    const mechanics = await Promise.all(
      Array.from(mechanicIds).map(async (mechanicIdStr) => {
        const mechanicId = mechanicIdStr as Id<"users">;
        const mechanic = await ctx.db.get(mechanicId);
        if (!mechanic || mechanic.role !== "mechanic") return null;

        const isPreferred = await ctx.db
          .query("preferredMechanics")
          .withIndex("by_owner_mechanic", (q) =>
            q.eq("ownerId", userId).eq("mechanicId", mechanicId)
          )
          .first();

        let imageUrl = null;
        if (mechanic.companyLogoStorageId) {
          imageUrl = await ctx.storage.getUrl(mechanic.companyLogoStorageId);
        } else if (mechanic.profilePhotoStorageId) {
          imageUrl = await ctx.storage.getUrl(mechanic.profilePhotoStorageId);
        }

        const metrics = await ctx.db
          .query("mechanicMetrics")
          .withIndex("by_mechanic", (q) => q.eq("mechanicId", mechanicId))
          .first();

        return {
          _id: mechanic._id,
          companyName: mechanic.companyName,
          fullName: mechanic.fullName,
          phone: mechanic.phone,
          imageUrl,
          availabilityStatus: mechanic.availabilityStatus || "available",
          avgOverallRating: metrics?.avgOverallRating || null,
          isPreferred: !!isPreferred,
        };
      })
    );

    return mechanics.filter(Boolean);
  },
});
