import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser, requireAuth, requireRole } from "./lib/auth";
import { Errors } from "./lib/errors";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

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
    const { userId } = await requireRole(ctx, "mechanic");

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw Errors.notFound("Work order");
    if (workOrder.mechanicId !== userId) throw Errors.accessDenied();
    if (workOrder.status !== "in_progress") {
      throw Errors.validation("Cannot add photos to a completed work order");
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

export const deleteWorkOrderPhoto = mutation({
  args: { photoId: v.id("workOrderPhotos") },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, "mechanic");

    const photo = await ctx.db.get(args.photoId);
    if (!photo) throw Errors.notFound("Photo");

    const workOrder = await ctx.db.get(photo.workOrderId);
    if (!workOrder) throw Errors.notFound("Work order");
    if (workOrder.mechanicId !== userId) throw Errors.accessDenied();
    if (workOrder.status !== "in_progress") {
      throw Errors.validation("Cannot delete photos from a completed work order");
    }

    await ctx.storage.delete(photo.storageId);
    await ctx.db.delete(args.photoId);

    return { success: true };
  },
});

export const getWorkOrderPhotos = query({
  args: { workOrderId: v.id("workOrders") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) return [];

    const vessel = await ctx.db.get(workOrder.vesselId);
    if (!vessel) return [];

    if (
      user.role !== "admin" &&
      workOrder.mechanicId !== user._id &&
      vessel.ownerId !== user._id
    ) {
      return [];
    }

    const photos = await ctx.db
      .query("workOrderPhotos")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();

    return Promise.all(
      photos.map(async (photo) => ({
        ...photo,
        url: await ctx.storage.getUrl(photo.storageId),
      }))
    );
  },
});

export const saveVesselImage = mutation({
  args: {
    vesselId: v.id("vessels"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) throw Errors.notFound("Vessel");
    if (user.role !== "admin" && vessel.ownerId !== userId) throw Errors.accessDenied();

    if (vessel.imageStorageId) {
      await ctx.storage.delete(vessel.imageStorageId);
    }

    await ctx.db.patch(args.vesselId, { imageStorageId: args.storageId });

    return { success: true };
  },
});

export const getVesselImageUrl = query({
  args: { vesselId: v.id("vessels") },
  handler: async (ctx, args) => {
    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel || !vessel.imageStorageId) return null;
    return ctx.storage.getUrl(vessel.imageStorageId);
  },
});

export const saveUserProfilePhoto = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);

    if (user.profilePhotoStorageId) {
      await ctx.storage.delete(user.profilePhotoStorageId);
    }

    await ctx.db.patch(userId, { profilePhotoStorageId: args.storageId });

    return { success: true };
  },
});

// Alias kept for backward compatibility
export const saveMechanicProfilePhoto = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);

    if (user.profilePhotoStorageId) {
      await ctx.storage.delete(user.profilePhotoStorageId);
    }

    await ctx.db.patch(userId, { profilePhotoStorageId: args.storageId });

    return { success: true };
  },
});

export const saveMechanicCompanyLogo = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "mechanic" && user.role !== "fleet_manager")) {
      throw new Error("Access denied");
    }

    if (user.companyLogoStorageId) {
      await ctx.storage.delete(user.companyLogoStorageId);
    }

    await ctx.db.patch(userId, { companyLogoStorageId: args.storageId });

    return { success: true };
  },
});

export const getUserProfilePhotoUrl = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);
    const targetUserId = args.userId ?? currentUser?._id;
    if (!targetUserId) return null;

    const user = await ctx.db.get(targetUserId);
    if (!user || !user.profilePhotoStorageId) return null;

    return ctx.storage.getUrl(user.profilePhotoStorageId);
  },
});

// Alias for backward compatibility
export const getMechanicProfilePhotoUrl = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);
    const targetUserId = args.userId ?? currentUser?._id;
    if (!targetUserId) return null;

    const user = await ctx.db.get(targetUserId);
    if (!user || !user.profilePhotoStorageId) return null;

    return ctx.storage.getUrl(user.profilePhotoStorageId);
  },
});

export const getMechanicCompanyLogoUrl = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);
    const targetUserId = args.userId ?? currentUser?._id;
    if (!targetUserId) return null;

    const user = await ctx.db.get(targetUserId);
    if (!user || !user.companyLogoStorageId) return null;

    return ctx.storage.getUrl(user.companyLogoStorageId);
  },
});
