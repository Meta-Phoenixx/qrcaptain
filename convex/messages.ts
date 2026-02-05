import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Send a message
export const sendMessage = mutation({
  args: {
    receiverId: v.id("users"),
    content: v.string(),
    vesselId: v.optional(v.id("vessels")),
    accessRequestId: v.optional(v.id("accessRequests")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const sender = await ctx.db.get(userId);
    const receiver = await ctx.db.get(args.receiverId);
    
    if (!sender || !receiver) {
      throw new Error("Invalid sender or receiver");
    }

    // Create the message
    const messageId = await ctx.db.insert("messages", {
      senderId: userId,
      receiverId: args.receiverId,
      vesselId: args.vesselId,
      accessRequestId: args.accessRequestId,
      content: args.content,
      isRead: false,
      createdAt: Date.now(),
    });

    // Create notification for the receiver
    let vesselName = "";
    if (args.vesselId) {
      const vessel = await ctx.db.get(args.vesselId);
      vesselName = vessel?.name || "";
    }

    await ctx.db.insert("notifications", {
      userId: args.receiverId,
      type: "new_message",
      title: "New Message",
      message: `${sender.fullName || sender.name || "Someone"} sent you a message${vesselName ? ` about ${vesselName}` : ""}`,
      relatedId: messageId,
      relatedType: "message",
      isRead: false,
      createdAt: Date.now(),
    });

    return { messageId };
  },
});

// Get conversation between two users (optionally filtered by vessel)
export const getConversation = query({
  args: {
    otherUserId: v.id("users"),
    vesselId: v.optional(v.id("vessels")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = args.limit || 100;

    // Get messages where current user is sender or receiver
    const sentMessages = await ctx.db
      .query("messages")
      .withIndex("by_sender", (q) => q.eq("senderId", userId))
      .filter((q) => q.eq(q.field("receiverId"), args.otherUserId))
      .collect();

    const receivedMessages = await ctx.db
      .query("messages")
      .withIndex("by_receiver", (q) => q.eq("receiverId", userId))
      .filter((q) => q.eq(q.field("senderId"), args.otherUserId))
      .collect();

    let allMessages = [...sentMessages, ...receivedMessages];

    // Filter by vessel if specified
    if (args.vesselId) {
      allMessages = allMessages.filter((m) => m.vesselId === args.vesselId);
    }

    // Sort by creation time and limit
    allMessages.sort((a, b) => a.createdAt - b.createdAt);
    
    if (allMessages.length > limit) {
      allMessages = allMessages.slice(-limit);
    }

    // Add sender info
    const messagesWithSender = await Promise.all(
      allMessages.map(async (message) => {
        const sender = await ctx.db.get(message.senderId);
        return {
          ...message,
          senderName: sender?.fullName || sender?.name || "Unknown",
          isFromMe: message.senderId === userId,
        };
      })
    );

    return messagesWithSender;
  },
});

// Get messages related to an access request
export const getAccessRequestMessages = query({
  args: {
    accessRequestId: v.id("accessRequests"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const request = await ctx.db.get(args.accessRequestId);
    if (!request) return [];

    // Verify user is part of this request
    if (request.mechanicId !== userId && request.ownerId !== userId) {
      return [];
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_access_request", (q) => q.eq("accessRequestId", args.accessRequestId))
      .order("asc")
      .collect();

    // Add sender info
    const messagesWithSender = await Promise.all(
      messages.map(async (message) => {
        const sender = await ctx.db.get(message.senderId);
        return {
          ...message,
          senderName: sender?.fullName || sender?.name || "Unknown",
          isFromMe: message.senderId === userId,
        };
      })
    );

    return messagesWithSender;
  },
});

// Get recent conversations list
export const getRecentConversations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get all messages involving this user
    const sentMessages = await ctx.db
      .query("messages")
      .withIndex("by_sender", (q) => q.eq("senderId", userId))
      .collect();

    const receivedMessages = await ctx.db
      .query("messages")
      .withIndex("by_receiver", (q) => q.eq("receiverId", userId))
      .collect();

    // Build a map of conversations by the other user
    const conversationMap = new Map<string, {
      otherUserId: string;
      lastMessage: typeof sentMessages[0];
      unreadCount: number;
    }>();

    for (const msg of [...sentMessages, ...receivedMessages]) {
      const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      const existing = conversationMap.get(otherUserId);
      
      const isUnread = msg.receiverId === userId && !msg.isRead;
      
      if (!existing || msg.createdAt > existing.lastMessage.createdAt) {
        conversationMap.set(otherUserId, {
          otherUserId,
          lastMessage: msg,
          unreadCount: (existing?.unreadCount || 0) + (isUnread ? 1 : 0),
        });
      } else if (isUnread) {
        existing.unreadCount++;
      }
    }

    // Get user details and sort by most recent
    const conversations = await Promise.all(
      Array.from(conversationMap.values()).map(async (conv) => {
        const otherUser = await ctx.db.get(conv.otherUserId as any);
        // Type guard to ensure we have a user document
        const isUserDoc = otherUser && 'role' in otherUser;
        return {
          otherUser: isUserDoc ? {
            _id: otherUser._id,
            name: (otherUser as any).fullName || (otherUser as any).name || "Unknown",
            role: (otherUser as any).role,
          } : null,
          lastMessage: {
            content: conv.lastMessage.content,
            createdAt: conv.lastMessage.createdAt,
            isFromMe: conv.lastMessage.senderId === userId,
          },
          unreadCount: conv.unreadCount,
        };
      })
    );

    // Sort by most recent message
    conversations.sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt);

    return conversations.filter((c) => c.otherUser !== null);
  },
});

// Mark messages as read
export const markConversationAsRead = mutation({
  args: {
    otherUserId: v.id("users"),
    vesselId: v.optional(v.id("vessels")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get unread messages from the other user
    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_receiver", (q) => q.eq("receiverId", userId))
      .filter((q) => 
        q.and(
          q.eq(q.field("senderId"), args.otherUserId),
          q.eq(q.field("isRead"), false)
        )
      )
      .collect();

    // Filter by vessel if specified
    const messagesToUpdate = args.vesselId
      ? unreadMessages.filter((m) => m.vesselId === args.vesselId)
      : unreadMessages;

    await Promise.all(
      messagesToUpdate.map((m) => ctx.db.patch(m._id, { isRead: true }))
    );

    return { success: true, count: messagesToUpdate.length };
  },
});

// Get unread message count
export const getUnreadMessageCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_receiver", (q) => q.eq("receiverId", userId))
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    return unreadMessages.length;
  },
});
