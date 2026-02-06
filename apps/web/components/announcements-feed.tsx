"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useTheme } from "./providers/theme-provider";

// Type icons for different announcement types
const getAnnouncementConfig = (type: string, mode: 'light' | 'dark') => {
  const isDark = mode === 'dark';
  
  const configs: Record<string, any> = {
    info: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgColor: isDark ? "bg-blue-500/10" : "bg-blue-50",
      borderColor: isDark ? "border-blue-500/20" : "border-blue-200",
      iconColor: isDark ? "text-blue-400" : "text-blue-600",
      badgeColor: isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700",
      iconBg: isDark ? "bg-blue-500/20" : "bg-white",
    },
    feature: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      bgColor: isDark ? "bg-purple-500/10" : "bg-purple-50",
      borderColor: isDark ? "border-purple-500/20" : "border-purple-200",
      iconColor: isDark ? "text-purple-400" : "text-purple-600",
      badgeColor: isDark ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-700",
      iconBg: isDark ? "bg-purple-500/20" : "bg-white",
    },
    maintenance: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      bgColor: isDark ? "bg-amber-500/10" : "bg-amber-50",
      borderColor: isDark ? "border-amber-500/20" : "border-amber-200",
      iconColor: isDark ? "text-amber-400" : "text-amber-600",
      badgeColor: isDark ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700",
      iconBg: isDark ? "bg-amber-500/20" : "bg-white",
    },
    tip: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      bgColor: isDark ? "bg-green-500/10" : "bg-green-50",
      borderColor: isDark ? "border-green-500/20" : "border-green-200",
      iconColor: isDark ? "text-green-400" : "text-green-600",
      badgeColor: isDark ? "bg-green-500/20 text-green-300" : "bg-green-100 text-green-700",
      iconBg: isDark ? "bg-green-500/20" : "bg-white",
    },
    urgent: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      bgColor: isDark ? "bg-red-500/10" : "bg-red-50",
      borderColor: isDark ? "border-red-500/20" : "border-red-200",
      iconColor: isDark ? "text-red-400" : "text-red-600",
      badgeColor: isDark ? "bg-red-500/20 text-red-300" : "bg-red-100 text-red-700",
      iconBg: isDark ? "bg-red-500/20" : "bg-white",
    },
  };
  
  return configs[type] || configs.info;
};

const TYPE_LABELS: Record<string, string> = {
  info: "Info",
  feature: "New Feature",
  maintenance: "Maintenance",
  tip: "Tip",
  urgent: "Urgent",
};

interface AnnouncementsFeedProps {
  maxItems?: number;
  showDismiss?: boolean;
  compact?: boolean;
}

export function AnnouncementsFeed({ 
  maxItems = 5, 
  showDismiss = true,
  compact = false 
}: AnnouncementsFeedProps) {
  const announcements = useQuery(api.announcements.getActiveAnnouncements);
  const dismissAnnouncement = useMutation(api.announcements.dismissAnnouncement);
  const { mode } = useTheme();

  if (!announcements) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className={`h-20 rounded-lg ${mode === 'dark' ? "bg-white/5" : "bg-gray-100"}`} />
        ))}
      </div>
    );
  }

  if (announcements.length === 0) {
    return null;
  }

  const displayedAnnouncements = announcements.slice(0, maxItems);

  const handleDismiss = async (announcementId: Id<"announcements">) => {
    await dismissAnnouncement({ announcementId });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {displayedAnnouncements.map((announcement) => {
          const config = getAnnouncementConfig(announcement.type, mode);
          return (
            <div
              key={announcement._id}
              className={`flex items-center gap-3 p-3 rounded-lg ${config.bgColor} ${config.borderColor} border`}
            >
              <span className={config.iconColor}>{config.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
                  {announcement.title}
                </p>
              </div>
              {announcement.isPinned && (
                <svg className={`w-4 h-4 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayedAnnouncements.map((announcement) => {
        const config = getAnnouncementConfig(announcement.type, mode);
        return (
          <div
            key={announcement._id}
            className={`relative p-4 rounded-xl ${config.bgColor} ${config.borderColor} border`}
          >
            {/* Dismiss button */}
            {showDismiss && !announcement.isPinned && (
              <button
                onClick={() => handleDismiss(announcement._id)}
                className={`absolute top-3 right-3 p-1 rounded-full transition-colors ${mode === 'dark' ? "text-gray-500 hover:text-gray-300 hover:bg-white/10" : "text-gray-400 hover:text-gray-600 hover:bg-white/50"}`}
                title="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            <div className="flex gap-4">
              {/* Icon */}
              <div className={`flex-shrink-0 p-2 rounded-lg ${config.iconBg} ${config.iconColor}`}>
                {config.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{announcement.title}</h4>
                  {announcement.isPinned && (
                    <svg className={`w-4 h-4 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                    </svg>
                  )}
                </div>
                <p className={`text-sm mb-2 ${mode === 'dark' ? "text-gray-300" : "text-gray-600"}`}>{announcement.content}</p>
                <div className="flex items-center gap-3 text-xs">
                  <span className={`px-2 py-0.5 rounded-full ${config.badgeColor}`}>
                    {TYPE_LABELS[announcement.type]}
                  </span>
                  <span className={mode === 'dark' ? "text-gray-400" : "text-gray-500"}>{formatDate(announcement.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {announcements.length > maxItems && (
        <p className={`text-center text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
          +{announcements.length - maxItems} more announcements
        </p>
      )}
    </div>
  );
}

// Badge component for notification count
export function AnnouncementBadge() {
  const count = useQuery(api.announcements.getAnnouncementCount);
  const { mode } = useTheme();

  if (!count || count === 0) return null;

  return (
    <span className={`absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white rounded-full ${mode === 'dark' ? "bg-blue-500" : "bg-captain-600"}`}>
      {count > 9 ? "9+" : count}
    </span>
  );
}