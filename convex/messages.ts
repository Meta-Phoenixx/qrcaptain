import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthenticatedUser, requireAuth } from "./lib/auth";
import { Errors } from "./lib/errors";

export const sendMessage = mutation({
  args: {
    receiverId: v.id("users"),
    content: v.string(),
    vesselId: v.optional(v.id("vessels")),
    accessRequestId: v.optional(v.id("accessRequests")),
  },
  handler: async (ctx, args) => {
    const { userId, user: sender } = await requireAuth(ctx);

    const receiver = await ctx.db.get(args.receiverId);
    if (!receiver) throw Errors.notFound("Receiver");

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

    let vesselName = "";
    if (args.vesselId) {
      const vessel = await ctx.db.get(args.vesselId);
      vesselName = vessel?.name || "";
    }

    await ctx.db.insert("notifications", {
      userId: args.receiverId,
      type: "new_message",
      title: "New Message",
      message: `${sender.firstName && sender.lastName ? `${sender.firstName} ${sender.lastName}` : sender.name || "Someone"} sent you a message${vesselName ? ` about ${vesselName}` : ""}`,
      relatedId: messageId,
      relatedType: "message",
      isRead: false,
      createdAt: Date.now(),
    });

    return { messageId };
  },
});

export const getMessageById = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return null;
    const userId = user._id;

    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    // Only allow sender or receiver to view
    if (message.senderId !== userId && message.receiverId !== userId) {
      return null;
    }

    // Get the other user's info
    const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
    const otherUser = await ctx.db.get(otherUserId);

    return {
      ...message,
      otherUserId,
      otherUserName: otherUser?.firstName && otherUser?.lastName
        ? `${otherUser.firstName} ${otherUser.lastName}`
        : otherUser?.name || "Unknown",
      otherUserCompany: otherUser?.companyName,
    };
  },
});

export const getConversation = query({
  args: {
    otherUserId: v.id("users"),
    vesselId: v.optional(v.id("vessels")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];
    const userId = user._id;

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
          senderName: sender?.firstName && sender?.lastName 
            ? `${sender.firstName} ${sender.lastName}` 
            : sender?.name || "Unknown",
          isFromMe: message.senderId === userId,
        };
      })
    );

    return messagesWithSender;
  },
});

export const getAccessRequestMessages = query({
  args: {
    accessRequestId: v.id("accessRequests"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];
    const userId = user._id;

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
          senderName: sender?.firstName && sender?.lastName 
            ? `${sender.firstName} ${sender.lastName}` 
            : sender?.name || "Unknown",
          isFromMe: message.senderId === userId,
        };
      })
    );

    return messagesWithSender;
  },
});

export const getRecentConversations = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return [];
    const userId = user._id;

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
        const otherUser = await ctx.db.get(conv.otherUserId as Parameters<typeof ctx.db.get>[0]);
        // Type guard to ensure we have a user document
        const isUserDoc = otherUser && 'role' in otherUser;
        return {
          otherUser: isUserDoc ? {
            _id: otherUser._id,
            name: (otherUser as any).firstName && (otherUser as any).lastName 
              ? `${(otherUser as any).firstName} ${(otherUser as any).lastName}` 
              : (otherUser as any).name || "Unknown",
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

export const markConversationAsRead = mutation({
  args: {
    otherUserId: v.id("users"),
    vesselId: v.optional(v.id("vessels")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const now = Date.now();

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
      messagesToUpdate.map((m) => ctx.db.patch(m._id, { 
        isRead: true,
        readAt: now,  // Track when message was read for response time
      }))
    );

    return { success: true, count: messagesToUpdate.length };
  },
});

export const getUnreadMessageCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return 0;
    const userId = user._id;

    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_receiver", (q) => q.eq("receiverId", userId))
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    return unreadMessages.length;
  },
});

// ============ RESPONSE TIME TRACKING ============

// Calculate average response time for a user (typically a mechanic)
// This measures how long it takes them to send their first reply after receiving a message
export const calculateAverageResponseTime = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all messages received by this user in the last 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    const receivedMessages = await ctx.db
      .query("messages")
      .withIndex("by_receiver_created", (q) => q.eq("receiverId", args.userId))
      .filter((q) => q.gte(q.field("createdAt"), thirtyDaysAgo))
      .collect();

    // Get all messages sent by this user in the last 30 days
    const sentMessages = await ctx.db
      .query("messages")
      .withIndex("by_sender", (q) => q.eq("senderId", args.userId))
      .filter((q) => q.gte(q.field("createdAt"), thirtyDaysAgo))
      .collect();

    // Group received messages by sender to find conversation threads
    const conversationStarts = new Map<string, typeof receivedMessages[0][]>();
    for (const msg of receivedMessages) {
      const senderId = msg.senderId;
      if (!conversationStarts.has(senderId)) {
        conversationStarts.set(senderId, []);
      }
      conversationStarts.get(senderId)!.push(msg);
    }

    // Calculate response times
    const responseTimes: number[] = [];

    for (const [senderId, incomingMessages] of conversationStarts) {
      // Sort incoming messages by time
      incomingMessages.sort((a, b) => a.createdAt - b.createdAt);

      // Find replies from the user to this sender
      const replies = sentMessages
        .filter(m => m.receiverId === senderId)
        .sort((a, b) => a.createdAt - b.createdAt);

      // For each incoming message, find the next reply
      for (const incoming of incomingMessages) {
        // Find the first reply after this incoming message
        const reply = replies.find(r => r.createdAt > incoming.createdAt);
        
        if (reply) {
          const responseTimeMs = reply.createdAt - incoming.createdAt;
          // Only count reasonable response times (less than 7 days)
          if (responseTimeMs < 7 * 24 * 60 * 60 * 1000) {
            responseTimes.push(responseTimeMs);
          }
        }
      }
    }

    if (responseTimes.length === 0) {
      return {
        avgResponseTimeMinutes: null,
        totalConversations: conversationStarts.size,
        responsesAnalyzed: 0,
      };
    }

    // Calculate average in minutes
    const avgMs = responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length;
    const avgMinutes = Math.round(avgMs / (60 * 1000));

    return {
      avgResponseTimeMinutes: avgMinutes,
      totalConversations: conversationStarts.size,
      responsesAnalyzed: responseTimes.length,
    };
  },
});

// Get formatted response time display string
export const getResponseTimeDisplay = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // First check if we have cached metrics
    const metrics = await ctx.db
      .query("mechanicMetrics")
      .withIndex("by_mechanic", (q) => q.eq("mechanicId", args.userId))
      .first();

    const minutes = metrics?.avgResponseTimeMinutes;
    
    if (!minutes) {
      return { display: "No data yet", minutes: null };
    }

    // Format the display string
    let display: string;
    if (minutes < 60) {
      display = `Usually responds in ${minutes} min`;
    } else if (minutes < 1440) {
      const hours = Math.round(minutes / 60);
      display = `Usually responds in ${hours} ${hours === 1 ? "hour" : "hours"}`;
    } else {
      const days = Math.round(minutes / 1440);
      display = `Usually responds in ${days} ${days === 1 ? "day" : "days"}`;
    }

    return { display, minutes };
  },
});

export const updateResponseTimeMetrics = mutation({
  args: {
    mechanicId: v.id("users"),
    avgResponseTimeMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);
    if (user.role !== "admin" && userId !== args.mechanicId) {
      throw Errors.accessDenied();
    }

    const existingMetrics = await ctx.db
      .query("mechanicMetrics")
      .withIndex("by_mechanic", (q) => q.eq("mechanicId", args.mechanicId))
      .first();

    if (existingMetrics) {
      await ctx.db.patch(existingMetrics._id, {
        avgResponseTimeMinutes: args.avgResponseTimeMinutes,
        responseTimeCalculatedAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("mechanicMetrics", {
        mechanicId: args.mechanicId,
        avgResponseTimeMinutes: args.avgResponseTimeMinutes,
        responseTimeCalculatedAt: Date.now(),
        totalJobsCompleted: 0,
        totalRatings: 0,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});
