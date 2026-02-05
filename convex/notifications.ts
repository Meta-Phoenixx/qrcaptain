import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get all notifications for the current user
export const getMyNotifications = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = args.limit || 50;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    return notifications;
  },
});

// Get unread notification count
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => 
        q.eq("userId", userId).eq("isRead", false)
      )
      .collect();

    return unreadNotifications.length;
  },
});

// Mark a notification as read
export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throw new Error("Notification not found");

    if (notification.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.notificationId, { isRead: true });
    return { success: true };
  },
});

// Mark all notifications as read
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => 
        q.eq("userId", userId).eq("isRead", false)
      )
      .collect();

    await Promise.all(
      unreadNotifications.map((n) => ctx.db.patch(n._id, { isRead: true }))
    );

    return { success: true, count: unreadNotifications.length };
  },
});

// Delete a notification
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throw new Error("Notification not found");

    if (notification.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.notificationId);
    return { success: true };
  },
});

// Clear all read notifications
export const clearReadNotifications = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const readNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isRead"), true))
      .collect();

    await Promise.all(
      readNotifications.map((n) => ctx.db.delete(n._id))
    );

    return { success: true, count: readNotifications.length };
  },
});

// Internal: Create a notification (used by other modules)
export const createNotification = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("access_request"),
      v.literal("access_approved"),
      v.literal("access_denied"),
      v.literal("work_order_started"),
      v.literal("work_order_completed"),
      v.literal("new_message")
    ),
    title: v.string(),
    message: v.string(),
    relatedId: v.optional(v.string()),
    relatedType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      relatedId: args.relatedId,
      relatedType: args.relatedType,
      isRead: false,
      createdAt: Date.now(),
    });

    return { notificationId };
  },
});
