"use client";

import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { InteractiveWrenchRating, WrenchRating } from "./wrench-rating";
import { GlassModal, GlassButton, GlassInput } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";

interface MechanicRatingFormProps {
  workOrderId: Id<"workOrders">;
  mechanicName: string;
  vesselName?: string;
  onSuccess?: () => void;
  onCancel: () => void;
}

export function MechanicRatingForm({
  workOrderId,
  mechanicName,
  vesselName,
  onSuccess,
  onCancel,
}: MechanicRatingFormProps) {
  const { mode } = useTheme();
  // Individual criteria ratings
  const [qualityRating, setQualityRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [professionalismRating, setProfessionalismRating] = useState(0);
  const [valueRating, setValueRating] = useState(0);
  
  // Overall rating (auto-calculated but adjustable)
  const [overallRating, setOverallRating] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create rating mutation
  const createMechanicRating = useMutation(api.ratings.createMechanicRating);

  // Auto-calculate overall rating from criteria
  const calculatedOverall = useMemo(() => {
    const ratings = [qualityRating, communicationRating, professionalismRating, valueRating];
    const filledRatings = ratings.filter(r => r > 0);
    if (filledRatings.length === 0) return 0;
    return filledRatings.reduce((sum, r) => sum + r, 0) / filledRatings.length;
  }, [qualityRating, communicationRating, professionalismRating, valueRating]);

  // Use custom overall if set, otherwise use calculated
  const displayOverall = overallRating !== null ? overallRating : calculatedOverall;

  const allCriteriaRated = qualityRating > 0 && communicationRating > 0 && 
    professionalismRating > 0 && valueRating > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allCriteriaRated) {
      setError("Please rate all criteria");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createMechanicRating({
        workOrderId,
        qualityRating,
        communicationRating,
        professionalismRating,
        valueRating,
        overallRating: displayOverall,
        review: review.trim() || undefined,
      });

      if (onSuccess) {
        onSuccess();
      }
      onCancel();
    } catch (err) {
      console.error("Failed to submit rating:", err);
      setError(err instanceof Error ? err.message : "Failed to submit rating");
    } finally {
      setIsSubmitting(false);
    }
  };

  const criteriaDescriptions = {
    quality: "Did they diagnose and fix the issue correctly?",
    communication: "Were they responsive and clear in their communication?",
    professionalism: "Were they on time, clean, and courteous?",
    value: "Was the pricing fair for the work performed?",
  };

  return (
    <GlassModal onClose={onCancel} className="max-w-lg max-h-[90vh]">
        {/* Header */}
        <div className={`sticky top-0 border-b px-6 py-4 rounded-t-xl z-10 ${mode === 'dark' ? "bg-[#1A1A23] border-white/10" : "bg-white border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Rate Your Mechanic</h2>
              <p className={`text-sm mt-0.5 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                {mechanicName}{vesselName ? ` • ${vesselName}` : ""}
              </p>
            </div>
            <button
              onClick={onCancel}
              className={`p-2 transition-colors ${mode === 'dark' ? "text-gray-400 hover:text-white" : "text-gray-400 hover:text-gray-600"}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className={`p-3 rounded-lg text-sm ${mode === 'dark' ? "bg-red-900/20 border border-red-500/30 text-red-300" : "bg-red-50 border border-red-200 text-red-700"}`}>
              {error}
            </div>
          )}

          {/* Overall Rating Display */}
          <div className={`text-center p-4 rounded-lg ${mode === 'dark' ? "bg-white/5" : "bg-gray-50"}`}>
            <p className={`text-sm mb-2 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Overall Rating</p>
            <div className="flex items-center justify-center gap-2">
              <WrenchRating rating={displayOverall} size="xl" />
              <span className={`text-2xl font-bold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
                {displayOverall > 0 ? displayOverall.toFixed(1) : "—"}
              </span>
            </div>
            {displayOverall > 0 && (
              <p className={`text-xs mt-2 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>
                Based on your ratings below
                {overallRating !== null && " (adjusted)"}
              </p>
            )}
          </div>

          {/* Criteria Ratings */}
          <div className="space-y-5">
            {/* Quality of Work */}
            <div className="space-y-2">
              <InteractiveWrenchRating
                value={qualityRating}
                onChange={setQualityRating}
                label="Quality of Work"
                required
              />
              <p className={`text-xs ml-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{criteriaDescriptions.quality}</p>
            </div>

            {/* Communication */}
            <div className="space-y-2">
              <InteractiveWrenchRating
                value={communicationRating}
                onChange={setCommunicationRating}
                label="Communication"
                required
              />
              <p className={`text-xs ml-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{criteriaDescriptions.communication}</p>
            </div>

            {/* Professionalism */}
            <div className="space-y-2">
              <InteractiveWrenchRating
                value={professionalismRating}
                onChange={setProfessionalismRating}
                label="Professionalism"
                required
              />
              <p className={`text-xs ml-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{criteriaDescriptions.professionalism}</p>
            </div>

            {/* Value */}
            <div className="space-y-2">
              <InteractiveWrenchRating
                value={valueRating}
                onChange={setValueRating}
                label="Value"
                required
              />
              <p className={`text-xs ml-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{criteriaDescriptions.value}</p>
            </div>
          </div>

          {/* Adjust Overall Rating */}
          {allCriteriaRated && (
            <div className={`pt-2 border-t ${mode === 'dark' ? "border-white/10" : "border-gray-100"}`}>
              <button
                type="button"
                onClick={() => setOverallRating(overallRating === null ? calculatedOverall : null)}
                className={`text-sm ${mode === 'dark' ? "text-blue-400 hover:text-blue-300" : "text-captain-600 hover:text-captain-700"}`}
              >
                {overallRating !== null ? "Use calculated average" : "Adjust overall rating manually"}
              </button>
              {overallRating !== null && (
                <div className="mt-3">
                  <InteractiveWrenchRating
                    value={Math.round(overallRating)}
                    onChange={(r) => setOverallRating(r)}
                    label="Custom Overall Rating"
                    size="md"
                  />
                </div>
              )}
            </div>
          )}

          {/* Written Review */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${mode === 'dark' ? "text-gray-200" : "text-gray-700"}`}>
              Written Review
              <span className={`font-normal ml-1 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>(optional)</span>
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share your experience to help other boat owners..."
              rows={4}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 resize-none ${
                mode === 'dark'
                  ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  : "bg-white border-gray-300 text-black placeholder-gray-400"
              }`}
            />
          </div>

          {/* Info Box */}
          <div className={`rounded-lg p-3 text-sm ${mode === 'dark' ? "bg-blue-900/20 text-blue-300" : "bg-blue-50 text-blue-700"}`}>
            <p>Your rating helps other boat owners find great mechanics and helps mechanics build their reputation.</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className={`flex-1 px-4 py-2.5 border rounded-lg transition-colors font-medium ${
                mode === 'dark'
                  ? "border-white/10 text-gray-300 hover:bg-white/5"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !allCriteriaRated}
              className={`flex-1 px-4 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2 ${
                mode === 'dark'
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-captain-600 hover:bg-captain-700 text-white"
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting...
                </>
              ) : (
                "Submit Rating"
              )}
            </button>
          </div>
        </form>
    </GlassModal>
  );
}
