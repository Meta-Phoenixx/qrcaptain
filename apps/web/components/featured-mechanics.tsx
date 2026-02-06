"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useTheme } from "./providers/theme-provider";

// Availability status badges
const AVAILABILITY_CONFIG = {
  available: {
    label: "Available",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
    dotColor: "bg-green-500",
  },
  limited: {
    label: "Limited",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-700",
    dotColor: "bg-yellow-500",
  },
  at_capacity: {
    label: "At Capacity",
    bgColor: "bg-orange-100",
    textColor: "text-orange-700",
    dotColor: "bg-orange-500",
  },
  unavailable: {
    label: "Unavailable",
    bgColor: "bg-gray-100",
    textColor: "text-gray-600",
    dotColor: "bg-gray-400",
  },
};

// Wrench rating component
function WrenchRating({ rating, size = "sm" }: { rating: number | null; size?: "sm" | "md" }) {
  if (rating === null) return null;

  const fullWrenches = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  const sizeClass = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`${sizeClass} ${
            i <= fullWrenches
              ? "text-captain-600"
              : i === fullWrenches + 1 && hasHalf
                ? "text-captain-400"
                : "text-gray-300"
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M14.25 2.5a.75.75 0 00-1.06 0l-1.06 1.06a.75.75 0 001.06 1.06l.28-.28 1.94 1.94-4.69 4.69a.75.75 0 000 1.06l.53.53a.75.75 0 001.06 0l4.69-4.69 1.94 1.94-.28.28a.75.75 0 101.06 1.06l1.06-1.06a.75.75 0 000-1.06l-5.5-5.5zm-8.5 8a.75.75 0 00-1.06 0L2.5 12.69a.75.75 0 000 1.06l3.75 3.75a.75.75 0 001.06 0l2.19-2.19a.75.75 0 000-1.06L5.75 10.5z" />
        </svg>
      ))}
    </div>
  );
}

interface FeaturedMechanicsProps {
  maxItems?: number;
  serviceAreas?: string[];
  onMechanicClick?: (mechanicId: Id<"users">) => void;
  onViewDirectory?: () => void;
}

export function FeaturedMechanics({
  maxItems = 4,
  serviceAreas,
  onMechanicClick,
  onViewDirectory,
}: FeaturedMechanicsProps) {
  const { mode } = useTheme();
  const featuredMechanics = useQuery(api.mechanicDirectory.getFeaturedMechanics, {
    limit: maxItems,
    serviceAreas,
  });

  if (!featuredMechanics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-32 ${mode === 'dark' ? "bg-white/5" : "bg-gray-100"} rounded-xl animate-pulse`} />
        ))}
      </div>
    );
  }

  if (featuredMechanics.length === 0) {
    return (
      <div className="text-center py-8">
        <div className={`w-16 h-16 mx-auto mb-3 ${mode === 'dark' ? "bg-white/5" : "bg-gray-100"} rounded-full flex items-center justify-center`}>
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <p className={`text-sm font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>No mechanics found</p>
        <p className={`text-xs ${mode === 'dark' ? "text-gray-400" : "text-gray-500"} mt-1`}>Try adjusting your service area filters</p>
        {onViewDirectory && (
          <button
            onClick={onViewDirectory}
            className="mt-4 px-4 py-2 text-sm text-captain-600 hover:text-captain-700 font-medium"
          >
            Browse Full Directory
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {featuredMechanics.map((mechanic) => {
          const availabilityConfig = AVAILABILITY_CONFIG[
            mechanic.availabilityStatus as keyof typeof AVAILABILITY_CONFIG
          ] || AVAILABILITY_CONFIG.available;

          return (
            <button
              key={mechanic._id}
              onClick={() => onMechanicClick?.(mechanic._id)}
              className={`flex items-start gap-3 p-4 border ${mode === 'dark' ? "bg-white/5 border-white/10 hover:border-captain-500/50" : "bg-white border-gray-200 hover:border-captain-300"} rounded-xl hover:shadow-md transition-all text-left group`}
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                {mechanic.imageUrl ? (
                  <img
                    src={mechanic.imageUrl}
                    alt={mechanic.companyName || (mechanic.firstName && mechanic.lastName ? `${mechanic.firstName} ${mechanic.lastName}` : "Mechanic")}
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-captain-100 flex items-center justify-center">
                    <svg className="w-7 h-7 text-captain-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"} truncate group-hover:text-captain-700`}>
                    {mechanic.companyName || (mechanic.firstName && mechanic.lastName ? `${mechanic.firstName} ${mechanic.lastName}` : "Unknown")}
                  </h4>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-2">
                  <WrenchRating rating={mechanic.avgOverallRating} />
                  {mechanic.totalRatings > 0 && (
                    <span className={`text-xs ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                      ({mechanic.totalRatings})
                    </span>
                  )}
                </div>

                {/* Status and badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${availabilityConfig.bgColor} ${availabilityConfig.textColor}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${availabilityConfig.dotColor}`} />
                    {availabilityConfig.label}
                  </span>
                  
                  {mechanic.isInsured && (
                    <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full">
                      Insured
                    </span>
                  )}
                  
                  {mechanic.hasMobileCapabilities && (
                    <span className="px-2 py-0.5 text-xs bg-green-50 text-green-600 rounded-full">
                      Mobile
                    </span>
                  )}
                </div>

                {/* Specializations */}
                {mechanic.specializations.length > 0 && (
                  <p className={`text-xs ${mode === 'dark' ? "text-gray-400" : "text-gray-500"} mt-2 truncate`}>
                    {mechanic.specializations.slice(0, 2).join(" • ")}
                  </p>
                )}

                {/* Stats */}
                <div className={`flex items-center gap-3 mt-2 text-xs ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                  <span>{mechanic.totalJobsCompleted} jobs</span>
                  {mechanic.avgResponseTimeMinutes && (
                    <span>
                      {mechanic.avgResponseTimeMinutes < 60
                        ? `${Math.round(mechanic.avgResponseTimeMinutes)}m response`
                        : `${Math.round(mechanic.avgResponseTimeMinutes / 60)}h response`}
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <svg className="w-5 h-5 text-gray-400 group-hover:text-captain-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          );
        })}
      </div>

      {/* View all link */}
      {onViewDirectory && (
        <div className="text-center pt-2">
          <button
            onClick={onViewDirectory}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-captain-600 hover:text-captain-700 font-medium hover:bg-captain-50 rounded-lg transition-colors"
          >
            View All Mechanics
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// Simple mechanic count badge
export function FeaturedMechanicsBadge() {
  const mechanics = useQuery(api.mechanicDirectory.getFeaturedMechanics, { limit: 10 });

  if (!mechanics) return null;

  const availableCount = mechanics.filter(
    (m) => m.availabilityStatus === "available"
  ).length;

  if (availableCount === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
      {availableCount} available
    </span>
  );
}
