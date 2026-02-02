import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Generate a unique QR code data string
function generateQRCodeData(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `QRC-${timestamp}-${random}`.toUpperCase();
}

// List vessels for the current owner
export const listMyVessels = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user) return [];

    let vessels: any[] = [];

    // Owners see their own vessels
    if (user.role === "owner") {
      vessels = await ctx.db
        .query("vessels")
        .withIndex("by_owner", (q) => q.eq("ownerId", userId))
        .collect();
    }
    // Mechanics see authorized vessels
    else if (user.role === "mechanic") {
      const authorizations = await ctx.db
        .query("mechanicAuthorizations")
        .withIndex("by_mechanic", (q) => q.eq("mechanicId", userId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      const vesselResults = await Promise.all(
        authorizations.map((auth) => ctx.db.get(auth.vesselId))
      );

      vessels = vesselResults.filter(Boolean);
    }
    // Admins see all vessels
    else if (user.role === "admin") {
      vessels = await ctx.db.query("vessels").collect();
    }

    // Add image URLs
    const vesselsWithImages = await Promise.all(
      vessels.map(async (vessel) => ({
        ...vessel,
        imageUrl: vessel.imageStorageId
          ? await ctx.storage.getUrl(vessel.imageStorageId)
          : null,
      }))
    );

    return vesselsWithImages;
  },
});

// Get a single vessel by ID
export const getVessel = query({
  args: { vesselId: v.id("vessels") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) return null;

    // Check access
    if (user.role === "owner" && vessel.ownerId !== userId) {
      return null;
    }

    if (user.role === "mechanic") {
      const auth = await ctx.db
        .query("mechanicAuthorizations")
        .withIndex("by_vessel_mechanic", (q) =>
          q.eq("vesselId", args.vesselId).eq("mechanicId", userId)
        )
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      if (!auth) return null;
    }

    // Get owner info
    const owner = await ctx.db.get(vessel.ownerId);

    return {
      ...vessel,
      ownerName: owner?.fullName,
      ownerEmail: owner?.email,
    };
  },
});

// Get vessel by QR code (for mechanics scanning)
export const getVesselByQRCode = query({
  args: { qrCodeData: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const vessel = await ctx.db
      .query("vessels")
      .withIndex("by_qr_code", (q) => q.eq("qrCodeData", args.qrCodeData))
      .first();

    if (!vessel) return null;

    // Get owner info
    const owner = await ctx.db.get(vessel.ownerId);

    // Get work history count
    const workOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_vessel", (q) => q.eq("vesselId", vessel._id))
      .collect();

    return {
      ...vessel,
      ownerName: owner?.fullName,
      ownerEmail: owner?.email,
      workOrderCount: workOrders.length,
    };
  },
});

// Create a new vessel
export const createVessel = mutation({
  args: {
    name: v.string(),
    registrationNumber: v.optional(v.string()),
    hullId: v.optional(v.string()),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    vesselType: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") {
      throw new Error("Only owners can create vessels");
    }

    const qrCodeData = generateQRCodeData();

    const vesselId = await ctx.db.insert("vessels", {
      ownerId: userId,
      name: args.name,
      registrationNumber: args.registrationNumber,
      hullId: args.hullId,
      make: args.make,
      model: args.model,
      year: args.year,
      vesselType: args.vesselType,
      notes: args.notes,
      qrCodeData,
    });

    return { vesselId, qrCodeData };
  },
});

// Update a vessel
export const updateVessel = mutation({
  args: {
    vesselId: v.id("vessels"),
    name: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    hullId: v.optional(v.string()),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
    vesselType: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) throw new Error("Vessel not found");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Only owner or admin can update
    if (user.role !== "admin" && vessel.ownerId !== userId) {
      throw new Error("Not authorized to update this vessel");
    }

    const { vesselId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(vesselId, filteredUpdates);
    return { success: true };
  },
});

// Delete a vessel
export const deleteVessel = mutation({
  args: { vesselId: v.id("vessels") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) throw new Error("Vessel not found");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Only owner or admin can delete
    if (user.role !== "admin" && vessel.ownerId !== userId) {
      throw new Error("Not authorized to delete this vessel");
    }

    await ctx.db.delete(args.vesselId);
    return { success: true };
  },
});

// Authorize a mechanic to work on a vessel
export const authorizeMechanic = mutation({
  args: {
    vesselId: v.id("vessels"),
    mechanicId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) throw new Error("Vessel not found");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Only owner or admin can authorize
    if (user.role !== "admin" && vessel.ownerId !== userId) {
      throw new Error("Not authorized");
    }

    // Check if mechanic exists and is actually a mechanic
    const mechanic = await ctx.db.get(args.mechanicId);
    if (!mechanic || mechanic.role !== "mechanic") {
      throw new Error("Invalid mechanic");
    }

    // Check if already authorized
    const existing = await ctx.db
      .query("mechanicAuthorizations")
      .withIndex("by_vessel_mechanic", (q) =>
        q.eq("vesselId", args.vesselId).eq("mechanicId", args.mechanicId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { isActive: true });
      return { authorizationId: existing._id };
    }

    const authId = await ctx.db.insert("mechanicAuthorizations", {
      vesselId: args.vesselId,
      mechanicId: args.mechanicId,
      authorizedAt: Date.now(),
      authorizedBy: userId,
      isActive: true,
    });

    return { authorizationId: authId };
  },
});

// Get admin statistics
export const getAdminStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") return null;

    const users = await ctx.db.query("users").collect();
    const vessels = await ctx.db.query("vessels").collect();
    const workOrders = await ctx.db.query("workOrders").collect();

    return {
      userCount: users.length,
      vesselCount: vessels.length,
      workOrderCount: workOrders.length,
      ownerCount: users.filter((u) => u.role === "owner").length,
      mechanicCount: users.filter((u) => u.role === "mechanic").length,
      activeWorkOrders: workOrders.filter((wo) => wo.status === "in_progress").length,
      completedWorkOrders: workOrders.filter((wo) => wo.status === "completed").length,
    };
  },
});

// Revoke mechanic authorization
export const revokeMechanicAuthorization = mutation({
  args: {
    vesselId: v.id("vessels"),
    mechanicId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) throw new Error("Vessel not found");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Only owner or admin can revoke
    if (user.role !== "admin" && vessel.ownerId !== userId) {
      throw new Error("Not authorized");
    }

    const auth = await ctx.db
      .query("mechanicAuthorizations")
      .withIndex("by_vessel_mechanic", (q) =>
        q.eq("vesselId", args.vesselId).eq("mechanicId", args.mechanicId)
      )
      .first();

    if (auth) {
      await ctx.db.patch(auth._id, { isActive: false });
    }

    return { success: true };
  },
});
