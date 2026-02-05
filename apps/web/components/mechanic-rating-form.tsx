"use client";

import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { InteractiveWrenchRating, WrenchRating } from "./wrench-rating";

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Rate Your Mechanic</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {mechanicName}{vesselName ? ` • ${vesselName}` : ""}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
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
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Overall Rating Display */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-2">Overall Rating</p>
            <div className="flex items-center justify-center gap-2">
              <WrenchRating rating={displayOverall} size="xl" />
              <span className="text-2xl font-bold text-gray-900">
                {displayOverall > 0 ? displayOverall.toFixed(1) : "—"}
              </span>
            </div>
            {displayOverall > 0 && (
              <p className="text-xs text-gray-400 mt-2">
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
              <p className="text-xs text-gray-500 ml-1">{criteriaDescriptions.quality}</p>
            </div>

            {/* Communication */}
            <div className="space-y-2">
              <InteractiveWrenchRating
                value={communicationRating}
                onChange={setCommunicationRating}
                label="Communication"
                required
              />
              <p className="text-xs text-gray-500 ml-1">{criteriaDescriptions.communication}</p>
            </div>

            {/* Professionalism */}
            <div className="space-y-2">
              <InteractiveWrenchRating
                value={professionalismRating}
                onChange={setProfessionalismRating}
                label="Professionalism"
                required
              />
              <p className="text-xs text-gray-500 ml-1">{criteriaDescriptions.professionalism}</p>
            </div>

            {/* Value */}
            <div className="space-y-2">
              <InteractiveWrenchRating
                value={valueRating}
                onChange={setValueRating}
                label="Value"
                required
              />
              <p className="text-xs text-gray-500 ml-1">{criteriaDescriptions.value}</p>
            </div>
          </div>

          {/* Adjust Overall Rating */}
          {allCriteriaRated && (
            <div className="pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setOverallRating(overallRating === null ? calculatedOverall : null)}
                className="text-sm text-captain-600 hover:text-captain-700"
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Written Review
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share your experience to help other boat owners..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 text-black placeholder-gray-400 resize-none"
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
            <p>Your rating helps other boat owners find great mechanics and helps mechanics build their reputation.</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !allCriteriaRated}
              className="flex-1 px-4 py-2.5 bg-captain-600 text-white rounded-lg hover:bg-captain-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
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
      </div>
    </div>
  );
}
