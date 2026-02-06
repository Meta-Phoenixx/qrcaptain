import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Get messages for a specific work order
export const getWorkOrderMessages = query({
  args: {
    workOrderId: v.id("workOrders"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

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

// Send a message in a work order chat
export const sendWorkOrderMessage = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (!args.content.trim()) {
      throw new Error("Message cannot be empty");
    }

    // Get the work order
    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw new Error("Work order not found");

    // Get the vessel
    const vessel = await ctx.db.get(workOrder.vesselId);
    if (!vessel) throw new Error("Vessel not found");

    // User must be either the owner or the mechanic
    const isOwner = vessel.ownerId === userId;
    const isMechanic = workOrder.mechanicId === userId;
    
    if (!isOwner && !isMechanic) {
      throw new Error("Not authorized to send messages on this work order");
    }

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
    await ctx.db.insert("notifications", {
      userId: receiverId,
      type: "new_message",
      title: "New Message",
      message: `New message regarding work order: ${args.content.substring(0, 50)}${args.content.length > 50 ? "..." : ""}`,
      isRead: false,
      createdAt: Date.now(),
      relatedId: args.workOrderId,
    });

    return { messageId };
  },
});

// Mark messages as read
export const markWorkOrderMessagesRead = mutation({
  args: {
    workOrderId: v.id("workOrders"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

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

// Get unread message count for a work order
export const getUnreadCount = query({
  args: {
    workOrderId: v.id("workOrders"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();

    return messages.filter((msg) => msg.receiverId === userId && !msg.isRead).length;
  },
});
