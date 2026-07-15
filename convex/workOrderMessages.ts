import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthenticatedUser, requireAuth } from "./lib/auth";
import { Errors } from "./lib/errors";
import { newMessage } from "./lib/notify";

export const getWorkOrderMessages = query({
  args: {
    workOrderId: v.id("workOrders"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];
    const userId = user._id;

    // Get the work order to verify access
    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) return [];

    // Get the vessel to check ownership
    const vessel = await ctx.db.get(workOrder.vesselId);
    if (!vessel) return [];

    // User must be either the owner or the mechanic
    const isOwner = vessel.ownerId === userId;
    const isMechanic = workOrder.mechanicId === userId;
    
    if (!isOwner && !isMechanic) return [];

    // Get all messages for this work order
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .order("asc")
      .collect();

    // Get sender info for each message
    const messagesWithSenderInfo = await Promise.all(
      messages.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);
        return {
          ...msg,
          senderName: sender?.firstName && sender?.lastName 
            ? `${sender.firstName} ${sender.lastName}` 
            : sender?.name || "Unknown",
          senderRole: msg.senderId === vessel.ownerId ? "owner" : "mechanic",
          isCurrentUser: msg.senderId === userId,
        };
      })
    );

    return messagesWithSenderInfo;
  },
});

export const sendWorkOrderMessage = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    if (!args.content.trim()) {
      throw Errors.validation("Message cannot be empty");
    }

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw Errors.notFound("Work order");

    const vessel = await ctx.db.get(workOrder.vesselId);
    if (!vessel) throw Errors.notFound("Vessel");

    const isOwner = vessel.ownerId === userId;
    const isMechanic = workOrder.mechanicId === userId;

    if (!isOwner && !isMechanic) throw Errors.accessDenied();

    // Determine the receiver (the other party)
    const receiverId = isOwner ? workOrder.mechanicId : vessel.ownerId;

    // Create the message
    const messageId = await ctx.db.insert("messages", {
      senderId: userId,
      receiverId: receiverId,
      vesselId: workOrder.vesselId,
      workOrderId: args.workOrderId,
      content: args.content.trim(),
      isRead: false,
      createdAt: Date.now(),
    });

    // Create a notification for the receiver
    await newMessage(ctx, {
      recipientId: receiverId,
      senderName: "Work Order Update",
      preview: args.content,
      relatedId: args.workOrderId,
      relatedType: "workOrder",
    });

    return { messageId };
  },
});

export const markWorkOrderMessagesRead = mutation({
  args: {
    workOrderId: v.id("workOrders"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    // Get unread messages for this work order where user is the receiver
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();

    // Mark messages as read where user is the receiver
    for (const msg of messages) {
      if (msg.receiverId === userId && !msg.isRead) {
        await ctx.db.patch(msg._id, { isRead: true });
      }
    }

    return { success: true };
  },
});

export const getUnreadCount = query({
  args: {
    workOrderId: v.id("workOrders"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return 0;
    const userId = user._id;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();

    return messages.filter((msg) => msg.receiverId === userId && !msg.isRead).length;
  },
});
