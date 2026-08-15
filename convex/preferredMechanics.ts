import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthenticatedUser, requireRole } from "./lib/auth";
import { Errors } from "./lib/errors";
import { getUserImageUrl } from "./lib/fileStorage";
import { addedToPreferredList } from "./lib/notify";

export const getPreferredMechanics = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user || user.role !== "owner") return [];
    const userId = user._id;

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
        const imageUrl = await getUserImageUrl(ctx, mechanic);

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
          firstName: mechanic.firstName,
          lastName: mechanic.lastName,
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

export const getPreferredMechanicById = query({
  args: {
    preferredId: v.id("preferredMechanics"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return null;
    const userId = user._id;

    const record = await ctx.db.get(args.preferredId);
    if (!record) return null;

    // Only the owner or mechanic in the record can view it
    if (record.ownerId !== userId && record.mechanicId !== userId) {
      return null;
    }

    // Return the "other" user's info (from the viewer's perspective)
    const otherUserId = record.ownerId === userId ? record.mechanicId : record.ownerId;
    const otherUser = await ctx.db.get(otherUserId);

    return {
      ...record,
      otherUserId,
      otherUserName: otherUser?.firstName && otherUser?.lastName
        ? `${otherUser.firstName} ${otherUser.lastName}`
        : otherUser?.name || "Unknown",
      otherUserCompany: otherUser?.companyName,
    };
  },
});

// Add mechanic to preferred list
export const addToPreferredList = mutation({
  args: {
    mechanicId: v.id("users"),
    vesselIds: v.optional(v.array(v.id("vessels"))),
    notes: v.optional(v.string()),
    hourlyRate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireRole(ctx, "owner");

    const mechanic = await ctx.db.get(args.mechanicId);
    if (!mechanic || mechanic.role !== "mechanic") {
      throw Errors.validation("Invalid mechanic");
    }

    const existing = await ctx.db
      .query("preferredMechanics")
      .withIndex("by_owner_mechanic", (q) =>
        q.eq("ownerId", userId).eq("mechanicId", args.mechanicId)
      )
      .first();

    if (existing) {
      throw Errors.conflict("Mechanic is already in your preferred list");
    }

    // Add to preferred list
    const preferredId = await ctx.db.insert("preferredMechanics", {
      ownerId: userId,
      mechanicId: args.mechanicId,
      addedAt: Date.now(),
      notes: args.notes,
      hourlyRate: args.hourlyRate,
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

    await addedToPreferredList(ctx, {
      mechanicId: args.mechanicId,
      ownerName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "An owner",
      vesselNames: vesselNames || undefined,
      preferredId,
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
    const { userId, user } = await requireRole(ctx, "owner");

    const preferred = await ctx.db
      .query("preferredMechanics")
      .withIndex("by_owner_mechanic", (q) =>
        q.eq("ownerId", userId).eq("mechanicId", args.mechanicId)
      )
      .first();

    if (!preferred) {
      throw Errors.notFound("Preferred mechanic record");
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
    const { userId, user } = await requireRole(ctx, "owner");

    const preferred = await ctx.db
      .query("preferredMechanics")
      .withIndex("by_owner_mechanic", (q) =>
        q.eq("ownerId", userId).eq("mechanicId", args.mechanicId)
      )
      .first();

    if (!preferred) {
      throw Errors.notFound("Preferred mechanic record");
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
    const { userId, user } = await requireRole(ctx, "owner");

    // Verify mechanic is in preferred list
    const preferred = await ctx.db
      .query("preferredMechanics")
      .withIndex("by_owner_mechanic", (q) =>
        q.eq("ownerId", userId).eq("mechanicId", args.mechanicId)
      )
      .first();

    if (!preferred) {
      throw Errors.notFound("Preferred mechanic record");
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

export const isPreferredMechanic = query({
  args: { mechanicId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user || user.role !== "owner") return false;
    const userId = user._id;

    const preferred = await ctx.db
      .query("preferredMechanics")
      .withIndex("by_owner_mechanic", (q) =>
        q.eq("ownerId", userId).eq("mechanicId", args.mechanicId)
      )
      .first();

    return !!preferred;
  },
});

// Get approved hourly rate — owner queries by mechanicId, mechanic queries by ownerId
export const getApprovedHourlyRate = query({
  args: { mechanicId: v.optional(v.id("users")), ownerId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return null;

    let ownerId: Id<"users">;
    let mechanicId: Id<"users">;

    if (user.role === "owner" && args.mechanicId) {
      ownerId = user._id;
      mechanicId = args.mechanicId;
    } else if ((user.role === "mechanic" || user.role === "fleet_manager") && args.ownerId) {
      ownerId = args.ownerId;
      mechanicId = user._id;
    } else {
      return null;
    }

    const preferred = await ctx.db
      .query("preferredMechanics")
      .withIndex("by_owner_mechanic", (q) =>
        q.eq("ownerId", ownerId).eq("mechanicId", mechanicId)
      )
      .first();

    return preferred?.hourlyRate ?? null;
  },
});

export const setApprovedHourlyRate = mutation({
  args: {
    mechanicId: v.id("users"),
    hourlyRate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, "owner");

    const preferred = await ctx.db
      .query("preferredMechanics")
      .withIndex("by_owner_mechanic", (q) =>
        q.eq("ownerId", userId).eq("mechanicId", args.mechanicId)
      )
      .first();

    if (!preferred) throw Errors.notFound("Preferred mechanic record");

    await ctx.db.patch(preferred._id, { hourlyRate: args.hourlyRate });
    return { success: true };
  },
});

export const getMechanicsWithAccess = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user || user.role !== "owner") return [];
    const userId = user._id;

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

        const imageUrl = await getUserImageUrl(ctx, mechanic);

        const metrics = await ctx.db
          .query("mechanicMetrics")
          .withIndex("by_mechanic", (q) => q.eq("mechanicId", mechanicId))
          .first();

        return {
          _id: mechanic._id,
          companyName: mechanic.companyName,
          firstName: mechanic.firstName,
          lastName: mechanic.lastName,
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
