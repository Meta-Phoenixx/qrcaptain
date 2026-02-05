import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Generate an upload URL for photos
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.storage.generateUploadUrl();
  },
});

// Save a photo to a work order
export const saveWorkOrderPhoto = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
    photoType: v.union(
      v.literal("before"),
      v.literal("during"),
      v.literal("after")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw new Error("Work order not found");

    if (workOrder.mechanicId !== userId) {
      throw new Error("Not authorized to add photos to this work order");
    }

    if (workOrder.status !== "in_progress") {
      throw new Error("Cannot add photos to a completed work order");
    }

    const photoId = await ctx.db.insert("workOrderPhotos", {
      workOrderId: args.workOrderId,
      storageId: args.storageId,
      caption: args.caption,
      photoType: args.photoType,
      uploadedAt: Date.now(),
    });

    return { photoId };
  },
});

// Delete a photo from a work order
export const deleteWorkOrderPhoto = mutation({
  args: { photoId: v.id("workOrderPhotos") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const photo = await ctx.db.get(args.photoId);
    if (!photo) throw new Error("Photo not found");

    const workOrder = await ctx.db.get(photo.workOrderId);
    if (!workOrder) throw new Error("Work order not found");

    if (workOrder.mechanicId !== userId) {
      throw new Error("Not authorized to delete this photo");
    }

    if (workOrder.status !== "in_progress") {
      throw new Error("Cannot delete photos from a completed work order");
    }

    // Delete from storage and database
    await ctx.storage.delete(photo.storageId);
    await ctx.db.delete(args.photoId);

    return { success: true };
  },
});

// Get photos for a work order
export const getWorkOrderPhotos = query({
  args: { workOrderId: v.id("workOrders") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) return [];

    const user = await ctx.db.get(userId);
    if (!user) return [];

    // Check access
    const vessel = await ctx.db.get(workOrder.vesselId);
    if (!vessel) return [];

    if (
      user.role !== "admin" &&
      workOrder.mechanicId !== userId &&
      vessel.ownerId !== userId
    ) {
      return [];
    }

    const photos = await ctx.db
      .query("workOrderPhotos")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();

    // Get URLs for all photos
    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => ({
        ...photo,
        url: await ctx.storage.getUrl(photo.storageId),
      }))
    );

    return photosWithUrls;
  },
});

// Update vessel image
export const saveVesselImage = mutation({
  args: {
    vesselId: v.id("vessels"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) throw new Error("Vessel not found");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    if (user.role !== "admin" && vessel.ownerId !== userId) {
      throw new Error("Not authorized to update vessel image");
    }

    // Delete old image if exists
    if (vessel.imageStorageId) {
      await ctx.storage.delete(vessel.imageStorageId);
    }

    await ctx.db.patch(args.vesselId, {
      imageStorageId: args.storageId,
    });

    return { success: true };
  },
});

// Get vessel image URL
export const getVesselImageUrl = query({
  args: { vesselId: v.id("vessels") },
  handler: async (ctx, args) => {
    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel || !vessel.imageStorageId) return null;

    return await ctx.storage.getUrl(vessel.imageStorageId);
  },
});

// ============================================
// USER PROFILE IMAGES (Both Owners & Mechanics)
// ============================================

// Save user profile photo (works for both owners and mechanics)
export const saveUserProfilePhoto = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Delete old image if exists
    if (user.profilePhotoStorageId) {
      await ctx.storage.delete(user.profilePhotoStorageId);
    }

    await ctx.db.patch(userId, {
      profilePhotoStorageId: args.storageId,
    });

    return { success: true };
  },
});

// Alias for backward compatibility
export const saveMechanicProfilePhoto = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Delete old image if exists
    if (user.profilePhotoStorageId) {
      await ctx.storage.delete(user.profilePhotoStorageId);
    }

    await ctx.db.patch(userId, {
      profilePhotoStorageId: args.storageId,
    });

    return { success: true };
  },
});

// Save mechanic company logo
export const saveMechanicCompanyLogo = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    if (user.role !== "mechanic") {
      throw new Error("Only mechanics can update company logo");
    }

    // Delete old logo if exists
    if (user.companyLogoStorageId) {
      await ctx.storage.delete(user.companyLogoStorageId);
    }

    await ctx.db.patch(userId, {
      companyLogoStorageId: args.storageId,
    });

    return { success: true };
  },
});

// Get user profile photo URL (works for both owners and mechanics)
export const getUserProfilePhotoUrl = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    const targetUserId = args.userId || currentUserId;
    
    if (!targetUserId) return null;

    const user = await ctx.db.get(targetUserId);
    if (!user || !user.profilePhotoStorageId) return null;

    return await ctx.storage.getUrl(user.profilePhotoStorageId);
  },
});

// Alias for backward compatibility
export const getMechanicProfilePhotoUrl = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    const targetUserId = args.userId || currentUserId;
    
    if (!targetUserId) return null;

    const user = await ctx.db.get(targetUserId);
    if (!user || !user.profilePhotoStorageId) return null;

    return await ctx.storage.getUrl(user.profilePhotoStorageId);
  },
});

// Get mechanic company logo URL
export const getMechanicCompanyLogoUrl = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    const targetUserId = args.userId || currentUserId;
    
    if (!targetUserId) return null;

    const user = await ctx.db.get(targetUserId);
    if (!user || !user.companyLogoStorageId) return null;

    return await ctx.storage.getUrl(user.companyLogoStorageId);
  },
});
