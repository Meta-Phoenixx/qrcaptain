"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useTheme } from "./providers/theme-provider";

type AvailabilityStatus = "available" | "limited" | "at_capacity" | "unavailable";

const statusConfig: Record<AvailabilityStatus, { 
  label: string; 
  description: string;
  color: string; 
  bgColor: string;
  dotColor: string;
}> = {
  available: {
    label: "Available for Work",
    description: "Open to new jobs and inquiries",
    color: "text-green-700",
    bgColor: "bg-green-100 border-green-200",
    dotColor: "bg-green-500",
  },
  limited: {
    label: "Limited Availability",
    description: "Taking selective jobs only",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100 border-yellow-200",
    dotColor: "bg-yellow-500",
  },
  at_capacity: {
    label: "At Capacity",
    description: "Fully booked, limited new work",
    color: "text-orange-700",
    bgColor: "bg-orange-100 border-orange-200",
    dotColor: "bg-orange-500",
  },
  unavailable: {
    label: "Unavailable",
    description: "Not taking new work at this time",
    color: "text-gray-700",
    bgColor: "bg-gray-100 border-gray-200",
    dotColor: "bg-gray-500",
  },
};

interface MechanicAvailabilityStatusProps {
  showSuggestion?: boolean;
  compact?: boolean;
}

export function MechanicAvailabilityStatus({ 
  showSuggestion = true,
  compact = false,
}: MechanicAvailabilityStatusProps) {
  const { mode } = useTheme();
  const [isChanging, setIsChanging] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Get suggested status
  const suggestedStatus = useQuery(api.mechanicDirectory.getSuggestedAvailabilityStatus);
  
  // Update status mutation
  const updateStatus = useMutation(api.mechanicDirectory.updateAvailabilityStatus);
  const updateMaxJobs = useMutation(api.mechanicDirectory.updateMaxConcurrentJobs);

  const currentStatus = suggestedStatus?.currentStatus || "available";
  const suggested = suggestedStatus?.suggestedStatus;
  const isManuallySet = suggestedStatus?.isManuallySet || false;
  const activeJobs = suggestedStatus?.activeJobCount || 0;
  const maxJobs = suggestedStatus?.maxConcurrentJobs || 5;

  const handleStatusChange = async (newStatus: AvailabilityStatus) => {
    setIsChanging(true);
    try {
      await updateStatus({ status: newStatus });
      setShowDropdown(false);
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setIsChanging(false);
    }
  };

  const handleUseSuggested = async () => {
    if (suggested) {
      await handleStatusChange(suggested);
    }
  };

  const config = statusConfig[currentStatus];
  const suggestedConfig = suggested ? statusConfig[suggested] : null;

  // Compact display mode
  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={isChanging}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${config.bgColor} ${config.color} hover:opacity-80 transition-opacity`}
        >
          <span className={`w-2 h-2 rounded-full ${config.dotColor}`}></span>
          {config.label}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDropdown && (
          <div className={`absolute top-full left-0 mt-2 w-64 rounded-lg shadow-lg border z-50 ${mode === 'dark' ? "bg-gray-800 border-white/10" : "bg-white border-gray-200"}`}>
            <div className="p-2">
              {(Object.keys(statusConfig) as AvailabilityStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={isChanging}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    status === currentStatus
                      ? "bg-captain-50"
                      : mode === 'dark' ? "hover:bg-white/5" : "hover:bg-gray-50"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${statusConfig[status].dotColor}`}></span>
                  <div>
                    <p className={`text-sm font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{statusConfig[status].label}</p>
                    <p className={`text-xs ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{statusConfig[status].description}</p>
                  </div>
                  {status === currentStatus && (
                    <svg className="w-4 h-4 text-captain-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full display mode
  return (
    <div className={`rounded-xl border p-4 ${mode === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className={`font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Availability Status</h3>
          <p className={`text-sm mt-0.5 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
            Let owners know when you're available for work
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${config.bgColor} ${config.color}`}>
          <span className={`w-2 h-2 rounded-full ${config.dotColor}`}></span>
          {config.label}
        </div>
      </div>

      {/* Job Counter */}
      <div className={`mb-4 p-3 rounded-lg ${mode === 'dark' ? "bg-white/5" : "bg-gray-50"}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>Active Jobs</span>
          <span className={`text-sm font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{activeJobs} / {maxJobs}</span>
        </div>
        <div className={`w-full h-2 rounded-full overflow-hidden ${mode === 'dark' ? "bg-white/10" : "bg-gray-200"}`}>
          <div
            className={`h-full rounded-full transition-all ${
              activeJobs >= maxJobs ? "bg-red-500" :
              activeJobs >= maxJobs * 0.8 ? "bg-orange-500" :
              activeJobs >= maxJobs * 0.5 ? "bg-yellow-500" :
              "bg-green-500"
            }`}
            style={{ width: `${Math.min((activeJobs / maxJobs) * 100, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Suggestion Banner */}
      {showSuggestion && suggested && suggested !== currentStatus && (
        <div className={`mb-4 p-3 border rounded-lg ${mode === 'dark' ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50 border-blue-200"}`}>
          <div className="flex items-start gap-3">
            <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${mode === 'dark' ? "text-blue-400" : "text-blue-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className={`text-sm ${mode === 'dark' ? "text-blue-200" : "text-blue-800"}`}>
                Based on your {activeJobs} active job{activeJobs !== 1 ? "s" : ""}, we suggest changing to{" "}
                <strong>{suggestedConfig?.label}</strong>.
              </p>
              <button
                onClick={handleUseSuggested}
                disabled={isChanging}
                className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {isChanging ? "Updating..." : "Use suggested status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Options */}
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(statusConfig) as AvailabilityStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => handleStatusChange(status)}
            disabled={isChanging}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              status === currentStatus
                ? "border-captain-500 bg-captain-50"
                : mode === 'dark' ? "border-white/10 hover:border-white/20" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${statusConfig[status].dotColor}`}></span>
              <span className={`text-sm font-medium ${status === currentStatus ? "text-captain-700" : mode === 'dark' ? "text-white" : "text-gray-900"}`}>
                {statusConfig[status].label}
              </span>
            </div>
            <p className={`text-xs pl-4 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{statusConfig[status].description}</p>
          </button>
        ))}
      </div>

      {/* Manual Override Notice */}
      {isManuallySet && (
        <p className="mt-3 text-xs text-gray-400 text-center">
          Status set manually. Auto-suggestions are paused.
        </p>
      )}
    </div>
  );
}

// Settings component for max concurrent jobs
export function MechanicAvailabilitySettings() {
  const { mode } = useTheme();
  const suggestedStatus = useQuery(api.mechanicDirectory.getSuggestedAvailabilityStatus);
  const updateMaxJobs = useMutation(api.mechanicDirectory.updateMaxConcurrentJobs);
  
  const [maxJobs, setMaxJobs] = useState(suggestedStatus?.maxConcurrentJobs || 5);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (suggestedStatus?.maxConcurrentJobs) {
      setMaxJobs(suggestedStatus.maxConcurrentJobs);
    }
  }, [suggestedStatus?.maxConcurrentJobs]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMaxJobs({ maxConcurrentJobs: maxJobs });
    } catch (error) {
      console.error("Failed to update max jobs:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`rounded-xl border p-4 ${mode === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}>
      <h3 className={`font-semibold mb-1 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Availability Settings</h3>
      <p className={`text-sm mb-4 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
        Set your maximum concurrent jobs for auto-status suggestions
      </p>

      <div className="space-y-4">
        <div>
          <label className={`block text-sm font-medium mb-2 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
            Maximum Concurrent Jobs
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="20"
              value={maxJobs}
              onChange={(e) => setMaxJobs(Number(e.target.value))}
              className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-captain-600 ${mode === 'dark' ? "bg-white/10" : "bg-gray-200"}`}
            />
            <span className={`w-12 text-center text-lg font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{maxJobs}</span>
          </div>
          <p className={`text-xs mt-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
            Your status will be suggested based on this threshold
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || maxJobs === suggestedStatus?.maxConcurrentJobs}
          className="w-full px-4 py-2 bg-captain-600 text-white rounded-lg hover:bg-captain-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
