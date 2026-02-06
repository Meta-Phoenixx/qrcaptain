"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { GlassModal } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";

interface GeneralMessagingProps {
  recipientId: Id<"users">;
  recipientName: string;
  recipientCompany?: string;
  vesselId?: Id<"vessels">;
  onClose: () => void;
}

export function GeneralMessaging({
  recipientId,
  recipientName,
  recipientCompany,
  vesselId,
  onClose,
}: GeneralMessagingProps) {
  const { mode } = useTheme();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get conversation
  const conversation = useQuery(api.messages.getConversation, {
    otherUserId: recipientId,
    vesselId,
    limit: 100,
  });

  // Send message mutation
  const sendMessage = useMutation(api.messages.sendMessage);
  const markAsRead = useMutation(api.messages.markConversationAsRead);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (conversation && conversation.length > 0) {
      markAsRead({ otherUserId: recipientId, vesselId });
    }
  }, [conversation, recipientId, vesselId, markAsRead]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) return;

    setIsSending(true);
    try {
      await sendMessage({
        receiverId: recipientId,
        content: message.trim(),
        vesselId,
      });
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (isYesterday) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" }) + 
        " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
  };

  return (
    <GlassModal onClose={onClose} className="max-w-lg h-[600px] flex flex-col p-0">
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${mode === 'dark' ? "border-white/10" : "border-gray-200"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-blue-900/20" : "bg-captain-100"}`}>
              <svg className={`w-5 h-5 ${mode === 'dark' ? "text-blue-400" : "text-captain-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className={`font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
                {recipientCompany || recipientName}
              </h3>
              {recipientCompany && recipientName && (
                <p className={`text-xs ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{recipientName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 transition-colors rounded-full ${mode === 'dark' ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {conversation === undefined ? (
            <div className="flex items-center justify-center h-full">
              <div className={`w-6 h-6 border-2 border-t-transparent rounded-full animate-spin ${mode === 'dark' ? "border-blue-500" : "border-captain-600"}`}></div>
            </div>
          ) : conversation.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${mode === 'dark' ? "bg-white/5" : "bg-gray-100"}`}>
                <svg className={`w-8 h-8 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>No messages yet</p>
              <p className={`text-xs mt-1 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>Send a message to start the conversation</p>
            </div>
          ) : (
            <>
              {conversation.map((msg) => (
                <div
                  key={msg._id}
                  className={`flex ${msg.isFromMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.isFromMe
                        ? mode === 'dark' ? "bg-blue-600 text-white rounded-br-md" : "bg-captain-600 text-white rounded-br-md"
                        : mode === 'dark' ? "bg-white/10 text-gray-200 rounded-bl-md" : "bg-gray-100 text-gray-900 rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.isFromMe 
                          ? mode === 'dark' ? "text-blue-200" : "text-captain-200"
                          : mode === 'dark' ? "text-gray-400" : "text-gray-400"
                      }`}
                    >
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSend} className={`p-4 border-t ${mode === 'dark' ? "border-white/10" : "border-gray-200"}`}>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className={`w-full px-4 py-2.5 border rounded-full focus:ring-2 focus:ring-captain-500 focus:border-captain-500 resize-none text-sm ${
                  mode === 'dark'
                    ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    : "bg-white border-gray-300 text-black placeholder-gray-400"
                }`}
                style={{ minHeight: "42px", maxHeight: "120px" }}
              />
            </div>
            <button
              type="submit"
              disabled={!message.trim() || isSending}
              className={`p-2.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 ${
                mode === 'dark'
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-captain-600 hover:bg-captain-700 text-white"
              }`}
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          <p className={`text-xs mt-2 text-center ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
    </GlassModal>
  );
}

// Conversation List Component (for showing all conversations)
export function ConversationList({ onSelectConversation }: { 
  onSelectConversation: (userId: Id<"users">, name: string, company?: string) => void 
}) {
  const { mode } = useTheme();
  const conversations = useQuery(api.messages.getRecentConversations);

  if (conversations === undefined) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
            <div className={`w-12 h-12 rounded-full ${mode === 'dark' ? "bg-white/5" : "bg-gray-200"}`}></div>
            <div className="flex-1 space-y-2">
              <div className={`h-4 rounded w-1/2 ${mode === 'dark' ? "bg-white/5" : "bg-gray-200"}`}></div>
              <div className={`h-3 rounded w-3/4 ${mode === 'dark' ? "bg-white/5" : "bg-gray-200"}`}></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className={`w-12 h-12 mx-auto mb-3 ${mode === 'dark' ? "text-gray-600" : "text-gray-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className={`text-sm ${mode === 'dark' ? "text-gray-500" : "text-gray-500"}`}>No conversations yet</p>
      </div>
    );
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  return (
    <div className={`divide-y ${mode === 'dark' ? "divide-white/10" : "divide-gray-100"}`}>
      {conversations.map((conv) => (
        <button
          key={conv.otherUser?._id}
          onClick={() => conv.otherUser && onSelectConversation(
            conv.otherUser._id as Id<"users">,
            conv.otherUser.name,
            undefined
          )}
          className={`w-full flex items-center gap-3 p-3 transition-colors text-left ${mode === 'dark' ? "hover:bg-white/5" : "hover:bg-gray-50"}`}
        >
          <div className="relative">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-blue-900/20" : "bg-captain-100"}`}>
              <svg className={`w-6 h-6 ${mode === 'dark' ? "text-blue-400" : "text-captain-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            {conv.unreadCount > 0 && (
              <span className={`absolute -top-1 -right-1 w-5 h-5 text-xs rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-blue-600 text-white" : "bg-captain-600 text-white"}`}>
                {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className={`font-medium truncate ${
                conv.unreadCount > 0 
                  ? mode === 'dark' ? "text-white" : "text-gray-900"
                  : mode === 'dark' ? "text-gray-300" : "text-gray-700"
              }`}>
                {conv.otherUser?.name}
              </p>
              <span className={`text-xs flex-shrink-0 ml-2 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>
                {formatTime(conv.lastMessage.createdAt)}
              </span>
            </div>
            <p className={`text-sm truncate ${
              conv.unreadCount > 0 
                ? mode === 'dark' ? "text-white font-medium" : "text-gray-900 font-medium"
                : mode === 'dark' ? "text-gray-400" : "text-gray-500"
            }`}>
              {conv.lastMessage.isFromMe && <span className="text-gray-400">You: </span>}
              {conv.lastMessage.content}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
