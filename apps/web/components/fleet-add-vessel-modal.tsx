"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { GlassModal, GlassButton } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const a = api as any;

export function FleetAddVesselModal({
  fleetId,
  onClose,
}: {
  fleetId: Id<"fleets">;
  onClose: () => void;
}) {
  const { mode } = useTheme();
  const [selectedVesselId, setSelectedVesselId] = useState<Id<"vessels"> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vessels = useQuery(a.vessels.listMyVessels);
  const addVesselToFleet = useMutation(a.fleets.addVesselToFleet);

  const available = (vessels ?? []).filter((v: any) => !v.fleetId);

  const isDark = mode === "dark";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
  const divider = isDark ? "border-white/10" : "border-gray-200";

  async function handleConfirm() {
    if (!selectedVesselId) return;
    setLoading(true);
    setError(null);
    try {
      await addVesselToFleet({ vesselId: selectedVesselId, fleetId });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Failed to add vessel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassModal onClose={onClose} className="max-w-lg p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className={`text-lg font-bold font-heading ${isDark ? "text-white" : "text-gray-900"}`}>Add Vessel to Fleet</h2>
        <button onClick={onClose} className={`text-2xl leading-none transition-colors ${isDark ? "text-white/30 hover:text-white" : "text-gray-300 hover:text-gray-700"}`}>×</button>
      </div>
      <div className="space-y-4">
        <p className={`text-sm ${textSecondary}`}>
          Select one of your vessels to add to this fleet. Only vessels not already in a fleet are shown.
        </p>

        {vessels === undefined ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-captain-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : available.length === 0 ? (
          <div className={`text-center py-8 text-sm ${textSecondary}`}>
            All your vessels are already assigned to a fleet, or you have no vessels yet.
          </div>
        ) : (
          <div className={`rounded-xl border overflow-hidden ${divider}`}>
            {available.map((vessel: any, i: number) => (
              <button
                key={vessel._id}
                onClick={() => setSelectedVesselId(vessel._id)}
                className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                  i > 0 ? `border-t ${divider}` : ""
                } ${
                  selectedVesselId === vessel._id
                    ? isDark
                      ? "bg-captain-500/15"
                      : "bg-captain-50"
                    : isDark
                    ? "hover:bg-white/[0.04]"
                    : "hover:bg-gray-50"
                }`}
              >
                <div>
                  <p className={`text-sm font-medium ${textPrimary}`}>{vessel.name}</p>
                  {(vessel.make || vessel.model) && (
                    <p className={`text-xs mt-0.5 ${textSecondary}`}>
                      {[vessel.make, vessel.model].filter(Boolean).join(" ")}
                    </p>
                  )}
                </div>
                {selectedVesselId === vessel._id && (
                  <svg className="w-5 h-5 text-captain-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <GlassButton
            variant="primary"
            onClick={handleConfirm}
            disabled={!selectedVesselId || loading}
            className="flex-1"
          >
            {loading ? "Adding…" : "Add to Fleet"}
          </GlassButton>
          <GlassButton variant="ghost" onClick={onClose}>
            Cancel
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
}
