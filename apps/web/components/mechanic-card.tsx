"use client";

import { Id } from "../../../convex/_generated/dataModel";
import { WrenchRating } from "./wrench-rating";

interface MechanicCardProps {
  mechanic: {
    _id: Id<"users">;
    companyName?: string;
    fullName?: string;
    imageUrl: string | null;
    availabilityStatus: "available" | "limited" | "at_capacity" | "unavailable";
    serviceAreas: string[];
    specializations: string[];
    certifications: string[];
    businessYearsInOperation?: number;
    isInsured?: boolean;
    isBonded?: boolean;
    hasMobileCapabilities?: boolean;
    avgOverallRating: number | null;
    totalRatings: number;
    avgResponseTimeMinutes: number | null;
    totalJobsCompleted: number;
  };
  onClick: (mechanicId: Id<"users">) => void;
}

// Status badge configuration
const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  available: {
    label: "Available",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  limited: {
    label: "Limited Availability",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
  },
  at_capacity: {
    label: "At Capacity",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  unavailable: {
    label: "Unavailable",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
  },
};

function formatResponseTime(minutes: number | null): string {
  if (!minutes) return "No data";
  if (minutes < 60) return `~${minutes} min`;
  if (minutes < 1440) return `~${Math.round(minutes / 60)} hrs`;
  return `~${Math.round(minutes / 1440)} days`;
}

export function MechanicCard({ mechanic, onClick }: MechanicCardProps) {
  const status = statusConfig[mechanic.availabilityStatus] || statusConfig.available;
  const displayName = mechanic.companyName || mechanic.fullName || "Unknown Mechanic";

  return (
    <div
      onClick={() => onClick(mechanic._id)}
      className="bg-white rounded-xl border border-gray-200 hover:border-captain-300 hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden group"
    >
      {/* Header with image and status */}
      <div className="relative p-4 pb-0">
        <div className="flex items-start gap-4">
          {/* Company Logo / Profile Photo */}
          <div className="flex-shrink-0">
            {mechanic.imageUrl ? (
              <img
                src={mechanic.imageUrl}
                alt={displayName}
                className="w-16 h-16 rounded-lg object-cover border border-gray-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-captain-100 to-captain-200 flex items-center justify-center border border-captain-200">
                <svg className="w-8 h-8 text-captain-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            )}
          </div>

          {/* Company Name and Status */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-lg truncate group-hover:text-captain-600 transition-colors">
              {displayName}
            </h3>
            
            {/* Status Badge */}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${status.bgColor} ${status.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                mechanic.availabilityStatus === "available" ? "bg-green-500" :
                mechanic.availabilityStatus === "limited" ? "bg-yellow-500" :
                mechanic.availabilityStatus === "at_capacity" ? "bg-orange-500" :
                "bg-gray-500"
              }`}></span>
              {status.label}
            </span>
          </div>
        </div>
      </div>

      {/* Rating and Metrics */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Wrench Rating */}
          <div className="flex items-center gap-2">
            {mechanic.avgOverallRating ? (
              <WrenchRating
                rating={mechanic.avgOverallRating}
                size="md"
                showValue
                showCount
                totalRatings={mechanic.totalRatings}
              />
            ) : (
              <span className="text-sm text-gray-400">No reviews yet</span>
            )}
          </div>

          {/* Response Time */}
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatResponseTime(mechanic.avgResponseTimeMinutes)}</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 mx-4"></div>

      {/* Bottom Info */}
      <div className="px-4 py-3 space-y-2">
        {/* Service Areas */}
        {mechanic.serviceAreas.length > 0 && (
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm text-gray-600 line-clamp-1">
              {mechanic.serviceAreas.slice(0, 3).join(", ")}
              {mechanic.serviceAreas.length > 3 && ` +${mechanic.serviceAreas.length - 3} more`}
            </p>
          </div>
        )}

        {/* Specializations */}
        {mechanic.specializations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {mechanic.specializations.slice(0, 3).map((spec, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-captain-50 text-captain-700"
              >
                {spec}
              </span>
            ))}
            {mechanic.specializations.length > 3 && (
              <span className="text-xs text-gray-500">
                +{mechanic.specializations.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Quick Stats Row */}
        <div className="flex items-center gap-4 pt-1 text-xs text-gray-500">
          {mechanic.totalJobsCompleted > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {mechanic.totalJobsCompleted} jobs
            </span>
          )}
          {mechanic.businessYearsInOperation && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {mechanic.businessYearsInOperation}+ years
            </span>
          )}
          {mechanic.isInsured && (
            <span className="flex items-center gap-1 text-green-600">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Insured
            </span>
          )}
          {mechanic.hasMobileCapabilities && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Mobile
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
