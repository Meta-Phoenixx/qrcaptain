"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useTheme } from "./providers/theme-provider";

interface NotificationBellProps {
  onClick?: () => void;
}

export function NotificationBell({ onClick }: NotificationBellProps) {
  const unreadCount = useQuery(api.notifications.getUnreadCount);
  const { mode } = useTheme();

  return (
    <button
      onClick={onClick}
      className={`relative p-2 rounded-lg transition-colors ${
        mode === 'dark' 
          ? "text-gray-300 hover:text-blue-400 hover:bg-white/10" 
          : "text-gray-600 hover:text-captain-600 hover:bg-captain-50"
      }`}
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {unreadCount !== undefined && unreadCount > 0 && (
        <span
          data-testid="notification-unread-count"
          className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onViewRequest?: (requestId: Id<"accessRequests">) => void;
  onViewQuote?: (workOrderId: Id<"workOrders">) => void;
  onViewWorkOrder?: (workOrderId: Id<"workOrders">) => void;
  onRespondToRequest?: (workOrderId: Id<"workOrders">) => void;
  onViewVessel?: (vesselId: Id<"vessels">) => void;
  onLeaveRating?: (workOrderId: Id<"workOrders">) => void;
  onViewAnnouncement?: () => void;
}

export function NotificationsPanel({ 
  isOpen, 
  onClose, 
  onViewRequest,
  onViewQuote,
  onViewWorkOrder,
  onRespondToRequest,
  onViewVessel,
  onLeaveRating,
  onViewAnnouncement,
}: NotificationsPanelProps) {
  const notifications = useQuery(api.notifications.getMyNotifications, { limit: 20 });
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const deleteNotification = useMutation(api.notifications.deleteNotification);
  const { mode } = useTheme();

  if (!isOpen) return null;

  const handleNotificationClick = (notification: typeof notifications extends (infer T)[] | undefined ? NonNullable<T> : never) => {
    // Mark as read in the background (fire-and-forget, don't block the UI action)
    if (!notification.isRead) {
      markAsRead({ notificationId: notification._id }).catch(() => {});
    }

    // Handle specific notification types based on relatedType and type
    if (!notification.relatedId) return;

    switch (notification.type) {
      // Access requests (owner viewing mechanic's request)
      case "access_request":
        if (onViewRequest) {
          onViewRequest(notification.relatedId as Id<"accessRequests">);
        }
        break;

      // Quote submitted (owner views the quote)
      case "quote_submitted":
        if (onViewQuote) {
          onViewQuote(notification.relatedId as Id<"workOrders">);
        }
        break;

      // Work order requested (mechanic responds to request)
      case "work_order_requested":
        if (onRespondToRequest) {
          onRespondToRequest(notification.relatedId as Id<"workOrders">);
        }
        break;

      // Quote accepted/declined or work order updates (view work order details)
      case "quote_accepted":
      case "quote_declined":
      case "request_declined":
      case "work_order_started":
      case "work_order_completed":
      case "work_order_updated":
        if (onViewWorkOrder) {
          onViewWorkOrder(notification.relatedId as Id<"workOrders">);
        }
        break;

      // Access approved/denied - view the vessel
      case "access_approved":
        if (notification.relatedType === "vessel" && onViewVessel) {
          onViewVessel(notification.relatedId as Id<"vessels">);
        }
        break;

      // Rating reminders - open to rating tab
      case "rate_mechanic_reminder":
      case "rate_owner_reminder":
        if (onLeaveRating) {
          onLeaveRating(notification.relatedId as Id<"workOrders">);
        }
        break;

      // New rating received - view the work order details
      case "new_rating_received":
        if (onViewWorkOrder && notification.relatedType === "workOrder") {
          onViewWorkOrder(notification.relatedId as Id<"workOrders">);
        }
        break;

      // New announcement - navigate to home screen to view
      case "new_announcement":
        if (onViewAnnouncement) {
          onViewAnnouncement();
        }
        break;

      default:
        // No specific action for other notification types
        break;
    }
  };

  // Check if notification has an actionable link
  const isClickable = (type: string) => {
    return [
      "access_request",
      "quote_submitted", 
      "work_order_requested",
      "quote_accepted",
      "quote_declined",
      "request_declined",
      "work_order_started",
      "work_order_completed",
      "work_order_updated",
      "access_approved",
      "new_rating_received",
      "rate_mechanic_reminder",
      "rate_owner_reminder",
      "new_announcement",
    ].includes(type);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead({});
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "access_request":
        return (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-amber-500/20" : "bg-amber-100"}`}>
            <svg className={`w-5 h-5 ${mode === 'dark' ? "text-amber-400" : "text-amber-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case "access_approved":
        return (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-green-500/20" : "bg-green-100"}`}>
            <svg className={`w-5 h-5 ${mode === 'dark' ? "text-green-400" : "text-green-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case "access_denied":
      case "access_revoked":
        return (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-red-500/20" : "bg-red-100"}`}>
            <svg className={`w-5 h-5 ${mode === 'dark' ? "text-red-400" : "text-red-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case "work_order_started":
        return (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-blue-500/20" : "bg-captain-100"}`}>
            <svg className={`w-5 h-5 ${mode === 'dark' ? "text-blue-400" : "text-captain-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        );
      case "work_order_completed":
        return (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-green-500/20" : "bg-green-100"}`}>
            <svg className={`w-5 h-5 ${mode === 'dark' ? "text-green-400" : "text-green-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case "work_order_updated":
        return (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-blue-500/20" : "bg-blue-100"}`}>
            <svg className={`w-5 h-5 ${mode === 'dark' ? "text-blue-400" : "text-blue-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        );
      case "work_order_requested":
        return (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-orange-500/20" : "bg-orange-100"}`}>
            <svg className={`w-5 h-5 ${mode === 'dark' ? "text-orange-400" : "text-orange-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case "quote_submitted":
        return (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-green-500/20" : "bg-green-100"}`}>
            <svg className={`w-5 h-5 ${mode === 'dark' ? "text-green-400" : "text-green-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case "quote_accepted":
        return (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-green-500/20" : "bg-green-100"}`}>
            <svg className={`w-5 h-5 ${mode === 'dark' ? "text-green-400" : "text-green-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case "quote_declined":
      case "request_declined":
        return (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-red-500/20" : "bg-red-100"}`}>
            <svg className={`w-5 h-5 ${mode === 'dark' ? "text-red-400" : "text-red-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case "new_message":
        return (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-blue-500/20" : "bg-blue-100"}`}>
            <svg className={`w-5 h-5 ${mode === 'dark' ? "text-blue-400" : "text-blue-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        );
      case "rate_mechanic_reminder":
      case "rate_owner_reminder":
      case "new_rating_received":
        return (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-yellow-500/20" : "bg-yellow-100"}`}>
            <svg className={`w-5 h-5 ${mode === 'dark' ? "text-yellow-400" : "text-yellow-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
        );
      case "added_to_preferred_list":
        return (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-purple-500/20" : "bg-purple-100"}`}>
            <svg className={`w-5 h-5 ${mode === 'dark' ? "text-purple-400" : "text-purple-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        );
      case "onboarding_reminder":
        return (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-purple-500/20" : "bg-purple-100"}`}>
            <svg className={`w-5 h-5 ${mode === 'dark' ? "text-purple-400" : "text-purple-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        );
      case "new_announcement":
        return (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-indigo-500/20" : "bg-indigo-100"}`}>
            <svg className={`w-5 h-5 ${mode === 'dark' ? "text-indigo-400" : "text-indigo-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-gray-700" : "bg-gray-100"}`}>
            <svg className={`w-5 h-5 ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        );
    }
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

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className={`absolute right-0 top-full mt-2 w-96 max-h-[80vh] rounded-2xl shadow-2xl border overflow-hidden z-50 ${mode === 'dark' ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
        {/* Header */}
        <div className={`px-4 py-3 border-b flex items-center justify-between ${mode === 'dark' ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
          <h3 className={`font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Notifications</h3>
          {notifications && notifications.length > 0 && (
            <button
              onClick={handleMarkAllRead}
              data-testid="mark-all-read"
              className={`text-sm font-medium ${mode === 'dark' ? "text-blue-400 hover:text-blue-300" : "text-captain-600 hover:text-captain-700"}`}
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Notifications list */}
        <div className="overflow-y-auto max-h-[60vh]">
          {notifications === undefined ? (
            <div className="p-8 text-center">
              <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto ${mode === 'dark' ? "border-blue-400" : "border-captain-600"}`}></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${mode === 'dark' ? "bg-gray-800" : "bg-gray-100"}`}>
                <svg className={`w-8 h-8 ${mode === 'dark' ? "text-gray-600" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <p className={mode === 'dark' ? "text-gray-400" : "text-gray-500"}>No notifications yet</p>
            </div>
          ) : (
            <div className={`divide-y ${mode === 'dark' ? "divide-gray-800" : "divide-gray-100"}`}>
              {notifications.map((notification) => {
                const clickable = isClickable(notification.type) && notification.relatedId;
                return (
                  <div
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    data-testid="notification-item"
                    data-notification-type={notification.type}
                    data-read={notification.isRead ? "true" : "false"}
                    aria-label={`${notification.isRead ? "Read" : "Unread"} notification: ${notification.title}`}
                    className={`p-4 transition-colors ${
                      clickable ? (mode === 'dark' ? "hover:bg-gray-800/50 cursor-pointer" : "hover:bg-gray-50 cursor-pointer") : ""
                    } ${!notification.isRead ? (mode === 'dark' ? "bg-blue-500/10" : "bg-captain-50/50") : ""}`}
                  >
                    <div className="flex gap-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${!notification.isRead ? "font-semibold" : "font-medium"} ${mode === 'dark' ? "text-gray-100" : "text-gray-900"}`}>
                            {notification.title}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification({ notificationId: notification._id });
                            }}
                            className={`p-1 rounded ${mode === 'dark' ? "text-gray-500 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <p className={`text-sm mt-0.5 line-clamp-2 ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className={`text-xs ${mode === 'dark' ? "text-gray-400" : "text-gray-400"}`}>
                            {formatTime(notification.createdAt)}
                          </p>
                          {clickable && (
                            <span className={`text-xs font-medium flex items-center gap-1 ${mode === 'dark' ? "text-blue-400" : "text-captain-600"}`}>
                              View
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </div>
                      {!notification.isRead && (
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${mode === 'dark' ? "bg-blue-500" : "bg-captain-500"}`}></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default NotificationBell;
