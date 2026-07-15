/**
 * File storage vendor module — wraps Convex ctx.storage.
 *
 * Centralizes all storage URL resolution so domain files never call
 * ctx.storage.getUrl() directly. Provides typed helpers for the common
 * patterns: single file, user avatar (logo → photo → null cascade), and
 * batch resolution across a list of items.
 */

import { Id } from "../_generated/dataModel";
import { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";

type StorageCtx = QueryCtx | MutationCtx | ActionCtx;

/** Resolve a single storage ID to a URL, or null if undefined. */
export async function getFileUrl(
  ctx: StorageCtx,
  storageId: Id<"_storage"> | undefined | null
): Promise<string | null> {
  if (!storageId) return null;
  return ctx.storage.getUrl(storageId);
}

/**
 * Resolve a user's display image using the standard cascade:
 * companyLogo → profilePhoto → null
 */
export async function getUserImageUrl(
  ctx: StorageCtx,
  user: {
    companyLogoStorageId?: Id<"_storage">;
    profilePhotoStorageId?: Id<"_storage">;
  }
): Promise<string | null> {
  if (user.companyLogoStorageId) {
    return ctx.storage.getUrl(user.companyLogoStorageId);
  }
  if (user.profilePhotoStorageId) {
    return ctx.storage.getUrl(user.profilePhotoStorageId);
  }
  return null;
}

/**
 * Batch-resolve image URLs for a list of items that each have an optional
 * imageStorageId field. Returns an array of (url | null) in the same order.
 */
export async function resolveImageUrls<T extends { imageStorageId?: Id<"_storage"> }>(
  ctx: StorageCtx,
  items: T[]
): Promise<(string | null)[]> {
  return Promise.all(items.map((item) => getFileUrl(ctx, item.imageStorageId)));
}
