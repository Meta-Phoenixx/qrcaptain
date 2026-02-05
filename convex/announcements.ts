import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Announcement type validator
const announcementTypeValidator = v.union(
  v.literal("info"),
  v.literal("feature"),
  v.literal("maintenance"),
  v.literal("tip"),
  v.literal("urgent")
);

// Target role validator
const targetRoleValidator = v.union(
  v.literal("owner"),
  v.literal("mechanic"),
  v.literal("admin"),
  v.literal("all")
);

// Get active announcements for the current user's role
export const getActiveAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user) return [];

    const userRole = user.role || "owner";
    const now = Date.now();

    // Get all active announcements
    const announcements = await ctx.db
      .query("announcements")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter by role and expiration
    const filtered = announcements.filter((a) => {
      // Check if announcement has expired
      if (a.expiresAt && a.expiresAt < now) return false;

      // Check if announcement targets user's role
      return a.targetRoles.includes(userRole) || a.targetRoles.includes("all");
    });

    // Get user's dismissed announcements
    const dismissals = await ctx.db
      .query("announcementDismissals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const dismissedIds = new Set(dismissals.map((d) => d.announcementId));

    // Filter out dismissed announcements (except pinned ones)
    const undismissed = filtered.filter(
      (a) => a.isPinned || !dismissedIds.has(a._id)
    );

    // Sort: pinned first, then by creation date (newest first)
    undismissed.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.createdAt - a.createdAt;
    });

    return undismissed;
  },
});

// Get all announcements (admin only)
export const listAllAnnouncements = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") return [];

    let announcements;
    if (args.includeInactive) {
      announcements = await ctx.db
        .query("announcements")
        .order("desc")
        .collect();
    } else {
      announcements = await ctx.db
        .query("announcements")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .order("desc")
        .collect();
    }

    // Add creator info
    const withCreator = await Promise.all(
      announcements.map(async (a) => {
        const creator = await ctx.db.get(a.createdBy);
        return {
          ...a,
          creatorName: creator?.fullName || creator?.email || "Unknown",
        };
      })
    );

    return withCreator;
  },
});

// Create announcement (admin only)
export const createAnnouncement = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    type: announcementTypeValidator,
    targetRoles: v.array(targetRoleValidator),
    isPinned: v.optional(v.boolean()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can create announcements");
    }

    const announcementId = await ctx.db.insert("announcements", {
      title: args.title,
      content: args.content,
      type: args.type,
      targetRoles: args.targetRoles,
      isActive: true,
      isPinned: args.isPinned || false,
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
      createdBy: userId,
    });

    return { announcementId };
  },
});

// Update announcement (admin only)
export const updateAnnouncement = mutation({
  args: {
    announcementId: v.id("announcements"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    type: v.optional(announcementTypeValidator),
    targetRoles: v.optional(v.array(targetRoleValidator)),
    isActive: v.optional(v.boolean()),
    isPinned: v.optional(v.boolean()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can update announcements");
    }

    const { announcementId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(announcementId, filteredUpdates);
    return { success: true };
  },
});

// Delete announcement (admin only)
export const deleteAnnouncement = mutation({
  args: {
    announcementId: v.id("announcements"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can delete announcements");
    }

    // Delete all dismissals for this announcement
    const dismissals = await ctx.db
      .query("announcementDismissals")
      .filter((q) => q.eq(q.field("announcementId"), args.announcementId))
      .collect();

    for (const dismissal of dismissals) {
      await ctx.db.delete(dismissal._id);
    }

    await ctx.db.delete(args.announcementId);
    return { success: true };
  },
});

// Dismiss announcement for current user
export const dismissAnnouncement = mutation({
  args: {
    announcementId: v.id("announcements"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if already dismissed
    const existing = await ctx.db
      .query("announcementDismissals")
      .withIndex("by_user_announcement", (q) =>
        q.eq("userId", userId).eq("announcementId", args.announcementId)
      )
      .first();

    if (existing) return { success: true };

    await ctx.db.insert("announcementDismissals", {
      userId,
      announcementId: args.announcementId,
      dismissedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get announcement count for badge display
export const getAnnouncementCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const user = await ctx.db.get(userId);
    if (!user) return 0;

    const userRole = user.role || "owner";
    const now = Date.now();

    // Get all active announcements
    const announcements = await ctx.db
      .query("announcements")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter by role and expiration
    const filtered = announcements.filter((a) => {
      if (a.expiresAt && a.expiresAt < now) return false;
      return a.targetRoles.includes(userRole) || a.targetRoles.includes("all");
    });

    // Get user's dismissed announcements
    const dismissals = await ctx.db
      .query("announcementDismissals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const dismissedIds = new Set(dismissals.map((d) => d.announcementId));

    // Count undismissed announcements
    return filtered.filter((a) => !dismissedIds.has(a._id)).length;
  },
});
