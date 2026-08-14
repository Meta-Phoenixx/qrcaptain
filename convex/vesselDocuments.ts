import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { Errors } from "./lib/errors";

const DOCUMENT_CATEGORIES = [
  "registration", "insurance", "title", "survey",
  "manual", "warranty", "invoice", "other",
] as const;

const categoryArg = v.union(
  v.literal("registration"),
  v.literal("insurance"),
  v.literal("title"),
  v.literal("survey"),
  v.literal("manual"),
  v.literal("warranty"),
  v.literal("invoice"),
  v.literal("other")
);

export const listVesselDocuments = query({
  args: { vesselId: v.id("vessels") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) throw Errors.notFound("Vessel");

    // Check access: owner, fleet_manager (owns vessel's fleet), mechanic authorized, or admin
    if (user.role !== "admin") {
      if (vessel.ownerId !== userId) {
        if (user.role === "mechanic") {
          const auth = await ctx.db.query("mechanicAuthorizations")
            .withIndex("by_vessel_mechanic", (q) => q.eq("vesselId", args.vesselId).eq("mechanicId", userId))
            .filter((q) => q.eq(q.field("isActive"), true))
            .first();
          if (!auth) throw Errors.accessDenied();
        } else {
          throw Errors.accessDenied();
        }
      }
    }

    const docs = await ctx.db.query("vesselDocuments")
      .withIndex("by_vessel", (q) => q.eq("vesselId", args.vesselId))
      .collect();

    return Promise.all(
      docs.map(async (doc) => ({
        ...doc,
        url: await ctx.storage.getUrl(doc.storageId),
      }))
    );
  },
});

export const addVesselDocument = mutation({
  args: {
    vesselId: v.id("vessels"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSizeBytes: v.optional(v.number()),
    category: categoryArg,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) throw Errors.notFound("Vessel");

    if (user.role !== "admin") {
      if (vessel.ownerId !== userId) {
        if (user.role === "mechanic") {
          const auth = await ctx.db.query("mechanicAuthorizations")
            .withIndex("by_vessel_mechanic", (q) => q.eq("vesselId", args.vesselId).eq("mechanicId", userId))
            .filter((q) => q.eq(q.field("isActive"), true))
            .first();
          if (!auth) throw Errors.accessDenied();
        } else {
          throw Errors.accessDenied();
        }
      }
    }

    return ctx.db.insert("vesselDocuments", {
      vesselId: args.vesselId,
      uploadedBy: userId,
      storageId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSizeBytes: args.fileSizeBytes,
      category: args.category,
      notes: args.notes,
      uploadedAt: Date.now(),
    });
  },
});

export const deleteVesselDocument = mutation({
  args: { documentId: v.id("vesselDocuments") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);

    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw Errors.notFound("Document");

    const vessel = await ctx.db.get(doc.vesselId);
    if (!vessel) throw Errors.notFound("Vessel");

    // Only uploader, vessel owner, or admin can delete
    if (user.role !== "admin" && vessel.ownerId !== userId && doc.uploadedBy !== userId) {
      throw Errors.accessDenied();
    }

    await ctx.storage.delete(doc.storageId);
    await ctx.db.delete(args.documentId);
  },
});
