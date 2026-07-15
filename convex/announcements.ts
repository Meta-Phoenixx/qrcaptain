import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthenticatedUser, requireAuth, requireAdmin } from "./lib/auth";
import { logAudit } from "./lib/audit";
import { Errors } from "./lib/errors";
import { notifyMany } from "./lib/notify";
import { requireMaxLength } from "./lib/validate";

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

export const getActiveAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
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
      return (a.targetRoles as string[]).includes(userRole) || (a.targetRoles as string[]).includes("all");
    });

    // Get user's dismissed announcements
    const dismissals = await ctx.db
      .query("announcementDismissals")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
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

export const listAllAnnouncements = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
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
          creatorName: creator?.firstName && creator?.lastName 
            ? `${creator.firstName} ${creator.lastName}` 
            : creator?.email || "Unknown",
        };
      })
    );

    return withCreator;
  },
});

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
    const { userId } = await requireAdmin(ctx);

    requireMaxLength(args.title, "Title", 200);
    requireMaxLength(args.content, "Content", 5000);

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

    // Send notifications to all targeted users
    const allUsers = await ctx.db.query("users").collect();
    const targetUsers = allUsers.filter((u) => {
      // Don't notify the admin who created the announcement
      if (u._id === userId) return false;
      // If targeting "all", include everyone
      if (args.targetRoles.includes("all")) return true;
      // Otherwise, check if user's role matches any target role
      const userRole = u.role || "owner";
      return args.targetRoles.includes(userRole as any);
    });

    const now = Date.now();
    const truncatedContent = args.content.length > 120 
      ? args.content.substring(0, 120) + "..." 
      : args.content;

    await notifyMany(ctx, targetUsers.map(u => u._id), {
      type: "new_announcement",
      title: args.title,
      message: truncatedContent,
      relatedId: announcementId,
      relatedType: "announcement",
    });

    return { announcementId };
  },
});

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
    const { userId } = await requireAdmin(ctx);

    if (args.title !== undefined) requireMaxLength(args.title, "Title", 200);
    if (args.content !== undefined) requireMaxLength(args.content, "Content", 5000);

    const { announcementId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(announcementId, filteredUpdates);

    // Send notifications if the announcement is active and not expired
    const announcement = await ctx.db.get(announcementId);
    if (!announcement) return { success: true };

    const now = Date.now();
    const isActive = announcement.isActive;
    const isExpired = announcement.expiresAt ? announcement.expiresAt < now : false;

    if (isActive && !isExpired) {
      const targetRoles = announcement.targetRoles;
      const allUsers = await ctx.db.query("users").collect();
      const targetUsers = allUsers.filter((u) => {
        if (u._id === userId) return false;
        if (targetRoles.includes("all")) return true;
        const userRole = u.role || "owner";
        return targetRoles.includes(userRole as any);
      });

      const truncatedContent = announcement.content.length > 120
        ? announcement.content.substring(0, 120) + "..."
        : announcement.content;

      await notifyMany(ctx, targetUsers.map(u => u._id), {
        type: "new_announcement",
        title: `Updated: ${announcement.title}`,
        message: truncatedContent,
        relatedId: announcementId,
        relatedType: "announcement",
      });
    }

    return { success: true };
  },
});

export const deleteAnnouncement = mutation({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

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

export const dismissAnnouncement = mutation({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

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

export const getAnnouncementCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return 0;

    const userRole = (user.role as string) || "owner";
    const now = Date.now();

    // Get all active announcements
    const announcements = await ctx.db
      .query("announcements")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter by role and expiration
    const filtered = announcements.filter((a) => {
      if (a.expiresAt && a.expiresAt < now) return false;
      return (a.targetRoles as string[]).includes(userRole) || (a.targetRoles as string[]).includes("all");
    });

    // Get user's dismissed announcements
    const dismissals = await ctx.db
      .query("announcementDismissals")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const dismissedIds = new Set(dismissals.map((d) => d.announcementId));

    // Count undismissed announcements
    return filtered.filter((a) => !dismissedIds.has(a._id)).length;
  },
});
