"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { MechanicCard } from "./mechanic-card";
import { MechanicSpotlight } from "./mechanic-spotlight";

type SortOption = "rating" | "responseTime" | "jobsCompleted" | "name";
type AvailabilityStatus = "available" | "limited" | "at_capacity" | "unavailable";

export function MechanicDirectory() {
  // Filter and sort state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<AvailabilityStatus | "">("");
  const [selectedSpecialization, setSelectedSpecialization] = useState("");
  const [selectedServiceArea, setSelectedServiceArea] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("rating");
  const [minRating, setMinRating] = useState<number | undefined>(undefined);

  // Selected mechanic for spotlight view
  const [selectedMechanicId, setSelectedMechanicId] = useState<Id<"users"> | null>(null);

  // Fetch mechanics with filters
  const mechanicsResult = useQuery(api.mechanicDirectory.listMechanics, {
    availabilityStatus: selectedStatus || undefined,
    specialization: selectedSpecialization || undefined,
    serviceArea: selectedServiceArea || undefined,
    sortBy,
    sortOrder: "desc",
    minRating,
    limit: 50,
  });

  // Search results (if searching)
  const searchResults = useQuery(
    api.mechanicDirectory.searchMechanics,
    searchTerm.length >= 2 ? { searchTerm, limit: 20 } : "skip"
  );

  const isLoading = mechanicsResult === undefined;
  const mechanics = searchTerm.length >= 2 
    ? searchResults || []
    : mechanicsResult?.mechanics || [];

  // Collect unique values for filters (from full list)
  const allSpecializations = new Set<string>();
  const allServiceAreas = new Set<string>();
  
  if (mechanicsResult?.mechanics) {
    for (const m of mechanicsResult.mechanics) {
      m.specializations.forEach(s => allSpecializations.add(s));
      m.serviceAreas.forEach(a => allServiceAreas.add(a));
    }
  }

  const handleMechanicClick = (mechanicId: Id<"users">) => {
    setSelectedMechanicId(mechanicId);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedStatus("");
    setSelectedSpecialization("");
    setSelectedServiceArea("");
    setMinRating(undefined);
    setSortBy("rating");
  };

  const hasActiveFilters = selectedStatus || selectedSpecialization || selectedServiceArea || minRating || searchTerm;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">QR Captain Mechanics</h1>
              <p className="text-sm text-gray-500 mt-1">
                Find trusted marine mechanics in your area
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-80">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or company..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 text-black"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Filters</h2>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-captain-600 hover:text-captain-700"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {/* Availability Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Availability
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as AvailabilityStatus | "")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-captain-500 focus:border-captain-500 text-black bg-white"
                  >
                    <option value="">All statuses</option>
                    <option value="available">Available</option>
                    <option value="limited">Limited Availability</option>
                    <option value="at_capacity">At Capacity</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>

                {/* Minimum Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Rating
                  </label>
                  <select
                    value={minRating || ""}
                    onChange={(e) => setMinRating(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-captain-500 focus:border-captain-500 text-black bg-white"
                  >
                    <option value="">Any rating</option>
                    <option value="4">4+ wrenches</option>
                    <option value="3">3+ wrenches</option>
                    <option value="2">2+ wrenches</option>
                  </select>
                </div>

                {/* Specialization */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specialization
                  </label>
                  <select
                    value={selectedSpecialization}
                    onChange={(e) => setSelectedSpecialization(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-captain-500 focus:border-captain-500 text-black bg-white"
                  >
                    <option value="">All specializations</option>
                    {Array.from(allSpecializations).sort().map((spec) => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>

                {/* Service Area */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Area
                  </label>
                  <select
                    value={selectedServiceArea}
                    onChange={(e) => setSelectedServiceArea(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-captain-500 focus:border-captain-500 text-black bg-white"
                  >
                    <option value="">All areas</option>
                    {Array.from(allServiceAreas).sort().map((area) => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort by
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-captain-500 focus:border-captain-500 text-black bg-white"
                  >
                    <option value="rating">Highest Rated</option>
                    <option value="responseTime">Fastest Response</option>
                    <option value="jobsCompleted">Most Jobs Completed</option>
                    <option value="name">Name (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Results count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                {isLoading ? (
                  "Loading mechanics..."
                ) : (
                  <>
                    Showing {mechanics.length} mechanic{mechanics.length !== 1 ? "s" : ""}
                    {hasActiveFilters && " (filtered)"}
                  </>
                )}
              </p>
            </div>

            {/* Mechanics Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : mechanics.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No mechanics found</h3>
                <p className="text-gray-500">
                  {hasActiveFilters 
                    ? "Try adjusting your filters to see more results."
                    : "No mechanics have completed their profiles yet."
                  }
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 px-4 py-2 text-sm font-medium text-captain-600 hover:text-captain-700"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {mechanics.map((mechanic: any) => (
                  <MechanicCard
                    key={mechanic._id}
                    mechanic={mechanic}
                    onClick={handleMechanicClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mechanic Spotlight Modal */}
      {selectedMechanicId && (
        <MechanicSpotlight
          mechanicId={selectedMechanicId}
          onClose={() => setSelectedMechanicId(null)}
        />
      )}
    </div>
  );
}
