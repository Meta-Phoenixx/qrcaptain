"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { WrenchRating } from "./wrench-rating";
import { GlassModal } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";

interface AddPreferredMechanicModalProps {
  mechanicId: Id<"users">;
  mechanicName: string;
  mechanicCompany?: string;
  onSuccess?: () => void;
  onCancel: () => void;
}

export function AddPreferredMechanicModal({
  mechanicId,
  mechanicName,
  mechanicCompany,
  onSuccess,
  onCancel,
}: AddPreferredMechanicModalProps) {
  const { mode } = useTheme();
  const [selectedVesselIds, setSelectedVesselIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current user and their vessels
  const currentUser = useQuery(api.users.currentUser);
  const vessels = useQuery(
    api.vessels.listByOwner,
    currentUser?._id ? { ownerId: currentUser._id } : "skip"
  );

  // Add to preferred list mutation
  const addToPreferredList = useMutation(api.preferredMechanics.addToPreferredList);

  const handleVesselToggle = (vesselId: string) => {
    setSelectedVesselIds((prev) =>
      prev.includes(vesselId)
        ? prev.filter((id) => id !== vesselId)
        : [...prev, vesselId]
    );
  };

  const handleSelectAll = () => {
    if (vessels) {
      setSelectedVesselIds(vessels.map((v) => v._id));
    }
  };

  const handleSelectNone = () => {
    setSelectedVesselIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setError(null);

    try {
      await addToPreferredList({
        mechanicId,
        vesselIds: selectedVesselIds.length > 0 
          ? selectedVesselIds.map((id) => id as Id<"vessels">)
          : undefined,
        notes: notes.trim() || undefined,
      });

      if (onSuccess) {
        onSuccess();
      }
      onCancel();
    } catch (err) {
      console.error("Failed to add mechanic:", err);
      setError(err instanceof Error ? err.message : "Failed to add mechanic to preferred list");
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName = mechanicCompany || mechanicName;

  return (
    <GlassModal onClose={onCancel} className="max-w-md max-h-[90vh]">
        {/* Header */}
        <div className={`sticky top-0 border-b px-6 py-4 rounded-t-xl z-10 ${mode === 'dark' ? "bg-[#1A1A23] border-white/10" : "bg-white border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Add to Preferred List</h2>
              <p className={`text-sm mt-0.5 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{displayName}</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error Message */}
          {error && (
            <div className={`p-3 rounded-lg text-sm ${mode === 'dark' ? "bg-red-900/20 border border-red-500/30 text-red-300" : "bg-red-50 border border-red-200 text-red-700"}`}>
              {error}
            </div>
          )}

          {/* Vessel Access Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className={`block text-sm font-medium ${mode === 'dark' ? "text-gray-200" : "text-gray-700"}`}>
                Grant Access to Vessels
              </label>
              {vessels && vessels.length > 1 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className={`text-xs ${mode === 'dark' ? "text-blue-400 hover:text-blue-300" : "text-captain-600 hover:text-captain-700"}`}
                  >
                    Select All
                  </button>
                  <span className={`${mode === 'dark' ? "text-gray-600" : "text-gray-300"}`}>|</span>
                  <button
                    type="button"
                    onClick={handleSelectNone}
                    className={`text-xs ${mode === 'dark' ? "text-blue-400 hover:text-blue-300" : "text-captain-600 hover:text-captain-700"}`}
                  >
                    Select None
                  </button>
                </div>
              )}
            </div>

            {!vessels || vessels.length === 0 ? (
              <p className={`text-sm p-3 rounded-lg ${mode === 'dark' ? "text-gray-400 bg-white/5" : "text-gray-500 bg-gray-50"}`}>
                You don't have any vessels yet. Add a vessel first to grant access.
              </p>
            ) : (
              <div className={`space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2 ${mode === 'dark' ? "border-white/10" : "border-gray-200"}`}>
                {vessels.map((vessel) => (
                  <label
                    key={vessel._id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${mode === 'dark' ? "hover:bg-white/5" : "hover:bg-gray-50"}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedVesselIds.includes(vessel._id)}
                      onChange={() => handleVesselToggle(vessel._id)}
                      className={`w-4 h-4 rounded focus:ring-captain-500 ${mode === 'dark' ? "bg-white/5 border-white/10 text-blue-500" : "text-captain-600 border-gray-300"}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${mode === 'dark' ? "text-gray-200" : "text-gray-900"}`}>
                        {vessel.name}
                      </p>
                      <p className={`text-xs ${mode === 'dark' ? "text-gray-500" : "text-gray-500"}`}>
                        {vessel.year} {vessel.make} {vessel.model}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <p className={`text-xs mt-2 ${mode === 'dark' ? "text-gray-500" : "text-gray-500"}`}>
              Granting access allows this mechanic to create work orders for selected vessels.
            </p>
          </div>

          {/* Notes Section */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${mode === 'dark' ? "text-gray-200" : "text-gray-700"}`}>
              Private Notes
              <span className={`font-normal ml-1 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add personal notes about this mechanic (only visible to you)..."
              rows={3}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 text-sm resize-none ${
                mode === 'dark'
                  ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  : "bg-white border-gray-300 text-black placeholder-gray-400"
              }`}
            />
          </div>

          {/* Info Box */}
          <div className={`rounded-lg p-3 text-sm ${mode === 'dark' ? "bg-blue-900/20 text-blue-300" : "bg-blue-50 text-blue-700"}`}>
            <p className="font-medium mb-1">What happens next?</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>This mechanic will be added to your preferred list</li>
              <li>They'll receive notification with QR codes for authorized vessels</li>
              <li>You can easily request work orders from them</li>
            </ul>
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
              disabled={isSubmitting}
              className={`flex-1 px-4 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2 ${
                mode === 'dark'
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-captain-600 hover:bg-captain-700 text-white"
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Adding...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Add to Preferred
                </>
              )}
            </button>
          </div>
        </form>
    </GlassModal>
  );
}
