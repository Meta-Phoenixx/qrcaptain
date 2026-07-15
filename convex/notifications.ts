import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthenticatedUser, requireAuth } from "./lib/auth";
import { Errors } from "./lib/errors";

export const getMyNotifications = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];

    return ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit || 50);
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .collect();

    return unread.length;
  },
});

export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throw Errors.notFound("Notification");
    if (notification.userId !== userId) throw Errors.accessDenied();

    await ctx.db.patch(args.notificationId, { isRead: true });
    return { success: true };
  },
});

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuth(ctx);

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", userId).eq("isRead", false)
      )
      .collect();

    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { isRead: true })));

    return { success: true, count: unread.length };
  },
});

export const deleteNotification = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throw Errors.notFound("Notification");
    if (notification.userId !== userId) throw Errors.accessDenied();

    await ctx.db.delete(args.notificationId);
    return { success: true };
  },
});

export const clearReadNotifications = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuth(ctx);

    const read = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isRead"), true))
      .collect();

    await Promise.all(read.map((n) => ctx.db.delete(n._id)));

    return { success: true, count: read.length };
  },
});

// Public mutation kept for legacy client callers. New code should insert
// notifications inline inside the relevant domain mutation instead of
// calling this endpoint.
export const createNotification = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("access_request"),
      v.literal("access_approved"),
      v.literal("access_denied"),
      v.literal("work_order_started"),
      v.literal("work_order_completed"),
      v.literal("new_message"),
      v.literal("onboarding_reminder")
    ),
    title: v.string(),
    message: v.string(),
    relatedId: v.optional(v.string()),
    relatedType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

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

export const sendOnboardingReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const incompleteMechanics = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.eq(q.field("role"), "mechanic"),
          q.or(
            q.eq(q.field("onboardingCompleted"), false),
            q.eq(q.field("onboardingCompleted"), undefined)
          )
        )
      )
      .collect();

    const now = Date.now();
    const TWELVE_HOURS = 12 * 60 * 60 * 1000;
    let sentCount = 0;

    for (const mechanic of incompleteMechanics) {
      if (
        mechanic.lastOnboardingReminder &&
        now - mechanic.lastOnboardingReminder < TWELVE_HOURS
      ) {
        continue;
      }

      await ctx.db.insert("notifications", {
        userId: mechanic._id,
        type: "onboarding_reminder",
        title: "Complete Your Profile",
        message:
          "Complete your mechanic profile to unlock all features including QR scanning, vessel access requests, and work order creation.",
        isRead: false,
        createdAt: now,
      });

      await ctx.db.patch(mechanic._id, { lastOnboardingReminder: now });
      sentCount++;
    }

    return {
      sentCount,
      totalIncomplete: incompleteMechanics.length,
      message: `Sent ${sentCount} onboarding reminders`,
    };
  },
});
