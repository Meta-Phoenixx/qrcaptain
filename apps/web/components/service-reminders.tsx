"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useTheme } from "./providers/theme-provider";

// Category icons
const CATEGORY_ICONS: Record<string, JSX.Element> = {
  propulsion: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  electrical: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  default: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

const URGENCY_CONFIG = {
  overdue: {
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-700",
    badgeColor: "bg-red-100 text-red-700",
    label: "Overdue",
  },
  urgent: {
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-700",
    badgeColor: "bg-orange-100 text-orange-700",
    label: "This Week",
  },
  soon: {
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    textColor: "text-yellow-700",
    badgeColor: "bg-yellow-100 text-yellow-700",
    label: "In 2 Weeks",
  },
  upcoming: {
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    badgeColor: "bg-blue-100 text-blue-700",
    label: "Upcoming",
  },
};

interface ServiceRemindersProps {
  maxItems?: number;
  daysAhead?: number;
  onRequestService?: (vesselId: Id<"vessels">, equipmentId: Id<"vesselEquipment">) => void;
}

export function ServiceReminders({ 
  maxItems = 5, 
  daysAhead = 30,
  onRequestService 
}: ServiceRemindersProps) {
  const { mode } = useTheme();
  const upcomingItems = useQuery(api.vesselEquipment.getUpcomingServiceItems, { daysAhead });

  if (!upcomingItems) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-16 rounded-lg ${mode === 'dark' ? "bg-white/5" : "bg-gray-100"}`} />
        ))}
      </div>
    );
  }

  if (upcomingItems.length === 0) {
    return (
      <div className="text-center py-8">
        <div className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-green-500/20" : "bg-green-100"}`}>
          <svg className={`w-8 h-8 ${mode === 'dark' ? "text-green-400" : "text-green-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className={`text-sm font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>All caught up!</p>
        <p className={`text-xs mt-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>No maintenance due in the next {daysAhead} days</p>
      </div>
    );
  }

  const displayedItems = upcomingItems.slice(0, maxItems);
  const overdueCount = upcomingItems.filter((item) => item.urgency === "overdue").length;
  const urgentCount = upcomingItems.filter((item) => item.urgency === "urgent").length;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-3">
      {/* Summary badges */}
      {(overdueCount > 0 || urgentCount > 0) && (
        <div className="flex gap-2 mb-4">
          {overdueCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
              {overdueCount} overdue
            </span>
          )}
          {urgentCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
              {urgentCount} this week
            </span>
          )}
        </div>
      )}

      {/* Reminder items */}
      {displayedItems.map((item, index) => {
        const config = URGENCY_CONFIG[item.urgency];
        const icon = CATEGORY_ICONS[item.equipment.category] || CATEGORY_ICONS.default;

        return (
          <div
            key={`${item.equipment._id}-${item.type}-${index}`}
            className={`flex items-start gap-3 p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}
          >
            {/* Icon */}
            <div className={`flex-shrink-0 p-2 rounded-lg bg-white ${config.textColor}`}>
              {icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.badgeColor}`}>
                  {config.label}
                </span>
                <span className="text-xs text-gray-500 capitalize">{item.type}</span>
              </div>
              <p className="font-medium text-gray-900 text-sm truncate">
                {item.equipment.name}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {item.vessel.name} &bull; {item.equipment.manufacturer || item.equipment.category}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {item.urgency === "overdue" 
                  ? `${Math.abs(item.daysUntilDue)} days overdue`
                  : item.daysUntilDue === 0 
                    ? "Due today"
                    : `Due ${formatDate(item.dueDate)}`
                }
              </p>
            </div>

            {/* Action button */}
            {onRequestService && (
              <button
                onClick={() => onRequestService(item.vessel._id, item.equipment._id)}
                className="flex-shrink-0 p-2 text-captain-600 hover:bg-captain-100 rounded-lg transition-colors"
                title="Request service"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            )}
          </div>
        );
      })}

      {upcomingItems.length > maxItems && (
        <p className="text-center text-sm text-gray-500 py-2">
          +{upcomingItems.length - maxItems} more items
        </p>
      )}
    </div>
  );
}

// Compact badge for service reminder count
export function ServiceReminderBadge() {
  const upcomingItems = useQuery(api.vesselEquipment.getUpcomingServiceItems, { daysAhead: 30 });

  if (!upcomingItems || upcomingItems.length === 0) return null;

  const overdueCount = upcomingItems.filter((item) => item.urgency === "overdue").length;
  const urgentCount = upcomingItems.filter((item) => item.urgency === "urgent").length;

  const priorityCount = overdueCount + urgentCount;

  if (priorityCount === 0 && upcomingItems.length > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {upcomingItems.length}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
      overdueCount > 0 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
    }`}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      {priorityCount}
    </span>
  );
}
