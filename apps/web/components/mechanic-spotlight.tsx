"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { GlassModal, GlassButton } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";
import { WrenchRating, WrenchRatingBreakdown } from "./wrench-rating";
import { GeneralMessaging } from "./general-messaging";

interface MechanicSpotlightProps {
  mechanicId: Id<"users">;
  onClose: () => void;
}

// Status badge configuration
const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  available: {
    label: "Available for Work",
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-100 dark:bg-green-500/20 dark:border-green-500/30",
  },
  limited: {
    label: "Limited Availability",
    color: "text-yellow-700 dark:text-amber-300",
    bgColor: "bg-yellow-100 dark:bg-amber-500/20 dark:border-amber-500/30",
  },
  at_capacity: {
    label: "At Capacity",
    color: "text-orange-700 dark:text-orange-300",
    bgColor: "bg-orange-100 dark:bg-orange-500/20 dark:border-orange-500/30",
  },
  unavailable: {
    label: "Currently Unavailable",
    color: "text-gray-700 dark:text-gray-300",
    bgColor: "bg-gray-100 dark:bg-gray-500/20 dark:border-gray-500/30",
  },
};

// Format hours of operation for display
function formatHours(hours: any): string {
  if (!hours) return "Not specified";
  if (hours.closed) return "Closed";
  if (!hours.open || !hours.close) return "Not specified";
  return `${hours.open} - ${hours.close}`;
}

const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const dayLabels: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

export function MechanicSpotlight({ mechanicId, onClose }: MechanicSpotlightProps) {
  const [activeTab, setActiveTab] = useState<"about" | "reviews" | "hours">("about");
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const { mode } = useTheme();

  // Fetch mechanic details
  const mechanic = useQuery(api.mechanicDirectory.getMechanicSpotlight, { mechanicId });
  const ratingsBreakdown = useQuery(api.ratings.getMechanicAverageRatings, { mechanicId });

  // Mutations
  const addToPreferred = useMutation(api.preferredMechanics.addToPreferredList);

  const isLoading = mechanic === undefined;

  if (isLoading) {
    return (
      <GlassModal onClose={onClose} className="max-w-2xl h-[90vh]">
        <div className="p-6 space-y-4 animate-pulse">
          <div className="flex items-start gap-4">
            <div className={`w-24 h-24 rounded-lg ${mode === 'dark' ? "bg-white/10" : "bg-gray-200"}`}></div>
            <div className="flex-1 space-y-2">
              <div className={`h-6 rounded w-3/4 ${mode === 'dark' ? "bg-white/10" : "bg-gray-200"}`}></div>
              <div className={`h-4 rounded w-1/2 ${mode === 'dark' ? "bg-white/10" : "bg-gray-200"}`}></div>
            </div>
          </div>
          <div className="space-y-2">
            <div className={`h-4 rounded w-full ${mode === 'dark' ? "bg-white/10" : "bg-gray-200"}`}></div>
            <div className={`h-4 rounded w-full ${mode === 'dark' ? "bg-white/10" : "bg-gray-200"}`}></div>
            <div className={`h-4 rounded w-2/3 ${mode === 'dark' ? "bg-white/10" : "bg-gray-200"}`}></div>
          </div>
        </div>
      </GlassModal>
    );
  }

  if (!mechanic) {
    return (
      <GlassModal onClose={onClose} className="max-w-md">
        <div className="p-6 text-center">
          <p className={mode === 'dark' ? "text-gray-300" : "text-gray-600"}>Mechanic not found</p>
          <div className="mt-4 flex justify-center">
            <GlassButton onClick={onClose} variant="primary">Close</GlassButton>
          </div>
        </div>
      </GlassModal>
    );
  }

  const status = statusConfig[mechanic.availabilityStatus] || statusConfig.available;
  const displayName = mechanic.companyName || (mechanic.firstName && mechanic.lastName ? `${mechanic.firstName} ${mechanic.lastName}` : "Unknown Mechanic");
  const imageUrl = mechanic.companyLogoUrl || mechanic.profilePhotoUrl;

  const handleAddToPreferred = async () => {
    try {
      await addToPreferred({ mechanicId });
      // Could show a success toast here
    } catch (error) {
      console.error("Failed to add to preferred list:", error);
    }
  };

  return (
    <GlassModal onClose={onClose} className="max-w-3xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`sticky top-0 border-b px-6 py-4 flex items-center justify-between z-10 backdrop-blur-md ${mode === 'dark' ? "bg-black/20 border-white/10" : "bg-white/80 border-gray-200"}`}>
          <h2 className={`text-xl font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{displayName}</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${mode === 'dark' ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Profile Header */}
          <div className={`p-6 border-b ${mode === 'dark' ? "border-white/10" : "border-gray-100"}`}>
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Image */}
              <div className="flex-shrink-0">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={displayName}
                    className={`w-28 h-28 rounded-xl object-cover border ${mode === 'dark' ? "border-white/10" : "border-gray-200"}`}
                  />
                ) : (
                  <div className={`w-28 h-28 rounded-xl flex items-center justify-center border ${mode === 'dark' ? "bg-white/5 border-white/10" : "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200"}`}>
                    <svg className={`w-12 h-12 ${mode === 'dark' ? "text-blue-400" : "text-blue-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${mode === 'dark' ? "backdrop-blur-sm" : ""} ${status.bgColor} ${status.color}`}>
                      <span className={`w-2 h-2 rounded-full mr-2 ${
                        mechanic.availabilityStatus === "available" ? "bg-green-500" :
                        mechanic.availabilityStatus === "limited" ? "bg-yellow-500" :
                        mechanic.availabilityStatus === "at_capacity" ? "bg-orange-500" :
                        "bg-gray-500"
                      }`}></span>
                      {status.label}
                    </span>
                  </div>
                </div>

                {/* Rating */}
                <div className="mt-3">
                  {mechanic.avgOverallRating ? (
                    <WrenchRating
                      rating={mechanic.avgOverallRating}
                      size="lg"
                      showValue
                      showCount
                      totalRatings={mechanic.totalRatings}
                    />
                  ) : (
                    <span className={mode === 'dark' ? "text-gray-400" : "text-gray-500"}>No reviews yet</span>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="flex flex-wrap gap-4 mt-4 text-sm">
                  {mechanic.responseTimeDisplay && (
                    <div className={`flex items-center gap-1.5 ${mode === 'dark' ? "text-gray-300" : "text-gray-600"}`}>
                      <svg className={`w-4 h-4 ${mode === 'dark' ? "text-gray-400" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {mechanic.responseTimeDisplay}
                    </div>
                  )}
                  {mechanic.totalJobsCompleted > 0 && (
                    <div className={`flex items-center gap-1.5 ${mode === 'dark' ? "text-gray-300" : "text-gray-600"}`}>
                      <svg className={`w-4 h-4 ${mode === 'dark' ? "text-gray-400" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {mechanic.totalJobsCompleted} jobs completed
                    </div>
                  )}
                  {mechanic.businessYearsInOperation && (
                    <div className={`flex items-center gap-1.5 ${mode === 'dark' ? "text-gray-300" : "text-gray-600"}`}>
                      <svg className={`w-4 h-4 ${mode === 'dark' ? "text-gray-400" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      In business {mechanic.businessYearsInOperation}+ years
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className={`border-b px-6 ${mode === 'dark' ? "border-white/10" : "border-gray-200"}`}>
            <nav className="flex gap-6">
              {(["about", "reviews", "hours"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? mode === 'dark' ? "border-blue-400 text-blue-400" : "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "about" && (
              <div className="space-y-6">
                {/* Bio */}
                {mechanic.bio && (
                  <div>
                    <h3 className={`text-sm font-medium mb-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>About</h3>
                    <p className={`text-sm ${mode === 'dark' ? "text-gray-300" : "text-gray-600"}`}>{mechanic.bio}</p>
                  </div>
                )}

                {/* Specializations */}
                {mechanic.specializations.length > 0 && (
                  <div>
                    <h3 className={`text-sm font-medium mb-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Specializations</h3>
                    <div className="flex flex-wrap gap-2">
                      {mechanic.specializations.map((spec, i) => (
                        <span
                          key={i}
                          className={`px-3 py-1 rounded-full text-sm ${mode === 'dark' ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "bg-blue-50 text-blue-700"}`}
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications */}
                {mechanic.certifications.length > 0 && (
                  <div>
                    <h3 className={`text-sm font-medium mb-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Certifications</h3>
                    <div className="flex flex-wrap gap-2">
                      {mechanic.certifications.map((cert, i) => (
                        <span
                          key={i}
                          className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${mode === 'dark' ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-green-50 text-green-700"}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Service Areas */}
                {mechanic.serviceAreas.length > 0 && (
                  <div>
                    <h3 className={`text-sm font-medium mb-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Service Areas</h3>
                    <div className="flex flex-wrap gap-2">
                      {mechanic.serviceAreas.map((area, i) => (
                        <span
                          key={i}
                          className={`px-3 py-1 rounded-full text-sm ${mode === 'dark' ? "bg-white/10 text-gray-300 border border-white/10" : "bg-gray-100 text-gray-700"}`}
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trust Badges */}
                <div>
                  <h3 className={`text-sm font-medium mb-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Trust & Safety</h3>
                  <div className="flex flex-wrap gap-3">
                    {mechanic.isInsured && (
                      <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${mode === 'dark' ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "bg-blue-50 text-blue-700"}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Insured
                      </span>
                    )}
                    {mechanic.isBonded && (
                      <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${mode === 'dark' ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "bg-blue-50 text-blue-700"}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Bonded
                      </span>
                    )}
                    {mechanic.hasMobileCapabilities && (
                      <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${mode === 'dark' ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "bg-purple-50 text-purple-700"}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Mobile Service
                      </span>
                    )}
                    {mechanic.businessLicenseNumber && (
                      <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${mode === 'dark' ? "bg-white/10 text-gray-300 border border-white/10" : "bg-gray-100 text-gray-700"}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Licensed
                      </span>
                    )}
                  </div>
                </div>

                {/* Languages */}
                {mechanic.languagesSpoken && mechanic.languagesSpoken.length > 0 && (
                  <div>
                    <h3 className={`text-sm font-medium mb-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Languages</h3>
                    <p className={`text-sm ${mode === 'dark' ? "text-gray-300" : "text-gray-600"}`}>{mechanic.languagesSpoken.join(", ")}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="space-y-6">
                {/* Rating Breakdown */}
                {ratingsBreakdown && ratingsBreakdown.totalRatings > 0 && (
                  <div className={`rounded-lg p-4 ${mode === 'dark' ? "bg-white/5 border border-white/10" : "bg-gray-50"}`}>
                    <h3 className={`text-sm font-medium mb-3 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Rating Breakdown</h3>
                    <WrenchRatingBreakdown
                      criteria={[
                        { label: "Quality of Work", rating: ratingsBreakdown.avgQuality || 0 },
                        { label: "Communication", rating: ratingsBreakdown.avgCommunication || 0 },
                        { label: "Professionalism", rating: ratingsBreakdown.avgProfessionalism || 0 },
                        { label: "Value", rating: ratingsBreakdown.avgValue || 0 },
                      ]}
                    />
                  </div>
                )}

                {/* Recent Reviews */}
                {mechanic.recentReviews && mechanic.recentReviews.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className={`text-sm font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Recent Reviews</h3>
                    {mechanic.recentReviews.map((review: any) => (
                      <div key={review._id} className={`border-b pb-4 last:border-0 ${mode === 'dark' ? "border-white/10" : "border-gray-100"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <WrenchRating rating={review.overallRating} size="sm" />
                          <span className={`text-xs ${mode === 'dark' ? "text-gray-400" : "text-gray-400"}`}>
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {review.review && (
                          <p className={`text-sm ${mode === 'dark' ? "text-gray-300" : "text-gray-600"}`}>{review.review}</p>
                        )}
                        {review.vesselType && (
                          <p className={`text-xs mt-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-400"}`}>
                            Work on {review.vesselMake} {review.vesselType}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-center py-6 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>No reviews yet</p>
                )}
              </div>
            )}

            {activeTab === "hours" && (
              <div className="space-y-4">
                <h3 className={`text-sm font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Hours of Operation</h3>
                {mechanic.hoursOfOperation ? (
                  <div className="space-y-2">
                    {dayNames.map((day) => (
                      <div key={day} className="flex justify-between text-sm">
                        <span className={mode === 'dark' ? "text-gray-400" : "text-gray-600"}>{dayLabels[day]}</span>
                        <span className={mode === 'dark' ? "text-gray-200" : "text-gray-900"}>
                          {formatHours((mechanic.hoursOfOperation as any)?.[day])}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Hours not specified</p>
                )}

                {/* Contact Info Toggle */}
                {(mechanic.phone || mechanic.email) && (
                  <div className={`mt-6 pt-4 border-t ${mode === 'dark' ? "border-white/10" : "border-gray-100"}`}>
                    <button
                      onClick={() => setShowContactInfo(!showContactInfo)}
                      className={`text-sm font-medium ${mode === 'dark' ? "text-blue-400 hover:text-blue-300" : "text-captain-600 hover:text-captain-700"}`}
                    >
                      {showContactInfo ? "Hide Contact Info" : "Show Contact Info"}
                    </button>
                    {showContactInfo && (
                      <div className="mt-3 space-y-2">
                        {mechanic.phone && (
                          <p className="text-sm">
                            <span className={mode === 'dark' ? "text-gray-400" : "text-gray-500"}>Phone:</span>{" "}
                            <a href={`tel:${mechanic.phone}`} className={mode === 'dark' ? "text-blue-400 hover:underline" : "text-captain-600 hover:underline"}>
                              {mechanic.phone}
                            </a>
                          </p>
                        )}
                        {mechanic.email && (
                          <p className="text-sm">
                            <span className={mode === 'dark' ? "text-gray-400" : "text-gray-500"}>Email:</span>{" "}
                            <a href={`mailto:${mechanic.email}`} className={mode === 'dark' ? "text-blue-400 hover:underline" : "text-captain-600 hover:underline"}>
                              {mechanic.email}
                            </a>
                          </p>
                        )}
                        {mechanic.websiteUrl && (
                          <p className="text-sm">
                            <span className={mode === 'dark' ? "text-gray-400" : "text-gray-500"}>Website:</span>{" "}
                            <a href={mechanic.websiteUrl} target="_blank" rel="noopener noreferrer" className={mode === 'dark' ? "text-blue-400 hover:underline" : "text-captain-600 hover:underline"}>
                              {mechanic.websiteUrl}
                            </a>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`sticky bottom-0 border-t px-6 py-4 flex gap-3 backdrop-blur-md ${mode === 'dark' ? "bg-black/20 border-white/10" : "bg-white/80 border-gray-200"}`}>
          <GlassButton
            variant="ghost"
            onClick={onClose}
            className="flex-1"
          >
            Close
          </GlassButton>
          {!mechanic.isPreferred && (
            <GlassButton
              variant="primary"
              onClick={handleAddToPreferred}
              className="flex-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Add to Preferred
            </GlassButton>
          )}
          <GlassButton
            variant="secondary"
            onClick={() => setShowMessaging(true)}
            className="flex-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Message
          </GlassButton>
        </div>

        {/* Messaging Modal */}
        {showMessaging && (
          <GeneralMessaging
            recipientId={mechanicId}
            recipientName={mechanic.firstName && mechanic.lastName ? `${mechanic.firstName} ${mechanic.lastName}` : "Mechanic"}
            recipientCompany={mechanic.companyName}
            onClose={() => setShowMessaging(false)}
          />
        )}
    </GlassModal>
  );
}
