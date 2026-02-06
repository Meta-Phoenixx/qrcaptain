"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useTheme } from "./providers/theme-provider";

// Activity type icons
const ACTIVITY_ICONS = {
  quote: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  work_order: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  message: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  access: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  ),
  rating: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
};

interface ActivityFeedProps {
  maxItems?: number;
  onViewWorkOrder?: (workOrderId: Id<"workOrders">) => void;
  onViewQuote?: (workOrderId: Id<"workOrders">) => void;
}

export function ActivityFeed({ maxItems = 10, onViewWorkOrder, onViewQuote }: ActivityFeedProps) {
  // Use notifications as the activity feed source
  const notifications = useQuery(api.notifications.getMyNotifications);
  const user = useQuery(api.users.currentUser);
  const { mode } = useTheme();

  if (!notifications || !user) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className={`w-8 h-8 rounded-full ${mode === 'dark' ? "bg-white/5" : "bg-gray-200"}`} />
            <div className="flex-1">
              <div className={`h-4 rounded w-3/4 mb-2 ${mode === 'dark' ? "bg-white/5" : "bg-gray-200"}`} />
              <div className={`h-3 rounded w-1/2 ${mode === 'dark' ? "bg-white/5" : "bg-gray-100"}`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className={`text-center py-8 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
        <svg className={`w-12 h-12 mx-auto mb-3 ${mode === 'dark' ? "text-gray-600" : "text-gray-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-sm">No recent activity</p>
        <p className={`text-xs mt-1 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>Activities will appear here as they happen</p>
      </div>
    );
  }

  const displayedActivities = notifications.slice(0, maxItems);

  const getActivityIcon = (type: string) => {
    if (type.includes("quote")) return ACTIVITY_ICONS.quote;
    if (type.includes("work_order")) return ACTIVITY_ICONS.work_order;
    if (type.includes("message")) return ACTIVITY_ICONS.message;
    if (type.includes("access")) return ACTIVITY_ICONS.access;
    if (type.includes("rating")) return ACTIVITY_ICONS.rating;
    return ACTIVITY_ICONS.work_order;
  };

  const getActivityColor = (type: string) => {
    const isDark = mode === 'dark';
    if (type.includes("quote")) return isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-100 text-blue-600";
    if (type.includes("work_order")) {
      if (type.includes("completed")) return isDark ? "bg-green-500/10 text-green-400" : "bg-green-100 text-green-600";
      if (type.includes("started")) return isDark ? "bg-yellow-500/10 text-yellow-400" : "bg-yellow-100 text-yellow-600";
      return isDark ? "bg-purple-500/10 text-purple-400" : "bg-purple-100 text-purple-600";
    }
    if (type.includes("message")) return isDark ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-100 text-indigo-600";
    if (type.includes("access")) return isDark ? "bg-orange-500/10 text-orange-400" : "bg-orange-100 text-orange-600";
    if (type.includes("rating")) return isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-100 text-amber-600";
    return isDark ? "bg-gray-500/10 text-gray-400" : "bg-gray-100 text-gray-600";
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const handleActivityClick = (notification: typeof notifications[0]) => {
    if (notification.relatedType === "workOrder" && notification.relatedId) {
      const workOrderId = notification.relatedId as Id<"workOrders">;
      if (notification.type.includes("quote") && onViewQuote) {
        onViewQuote(workOrderId);
      } else if (onViewWorkOrder) {
        onViewWorkOrder(workOrderId);
      }
    }
  };

  return (
    <div className="space-y-1">
      {displayedActivities.map((activity) => (
        <button
          key={activity._id}
          onClick={() => handleActivityClick(activity)}
          className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${
            mode === 'dark' ? "hover:bg-white/5" : "hover:bg-gray-50"
          } ${
            !activity.isRead 
              ? (mode === 'dark' ? "bg-blue-500/10" : "bg-captain-50/50")
              : ""
          }`}
        >
          {/* Icon */}
          <div className={`flex-shrink-0 p-2 rounded-full ${getActivityColor(activity.type)}`}>
            {getActivityIcon(activity.type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${
              !activity.isRead 
                ? `font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`
                : (mode === 'dark' ? "text-gray-300" : "text-gray-700")
            }`}>
              {activity.title}
            </p>
            <p className={`text-xs mt-0.5 line-clamp-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{activity.message}</p>
            <p className={`text-xs mt-1 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>{formatTime(activity.createdAt)}</p>
          </div>

          {/* Unread indicator */}
          {!activity.isRead && (
            <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${mode === 'dark' ? "bg-blue-500" : "bg-captain-600"}`} />
          )}
        </button>
      ))}

      {notifications.length > maxItems && (
        <p className={`text-center text-sm py-2 ${mode === 'dark' ? "text-gray-500" : "text-gray-500"}`}>
          +{notifications.length - maxItems} more activities
        </p>
      )}
    </div>
  );
}

// Compact activity summary for dashboard cards
export function ActivitySummary() {
  const notifications = useQuery(api.notifications.getMyNotifications);
  const { mode } = useTheme();

  if (!notifications) {
    return <div className={`h-4 rounded w-24 animate-pulse ${mode === 'dark' ? "bg-white/5" : "bg-gray-100"}`} />;
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const recentCount = notifications.filter(
    (n) => Date.now() - n.createdAt < 24 * 60 * 60 * 1000
  ).length;

  return (
    <div className="flex items-center gap-4 text-sm">
      {unreadCount > 0 && (
        <span className={`flex items-center gap-1 ${mode === 'dark' ? "text-blue-400" : "text-captain-600"}`}>
          <span className={`w-2 h-2 rounded-full ${mode === 'dark' ? "bg-blue-400" : "bg-captain-600"}`} />
          {unreadCount} unread
        </span>
      )}
      <span className={mode === 'dark' ? "text-gray-400" : "text-gray-500"}>{recentCount} in last 24h</span>
    </div>
  );
}