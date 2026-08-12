"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { GlassModal, GlassButton } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";

const a = api as any;

const VESSEL_TYPES = [
  "Motorboat", "Sailboat", "Catamaran", "Pontoon", "Jet Ski / PWC",
  "Fishing Boat", "Yacht", "Houseboat", "Inflatable / RIB", "Other",
];

const CURRENT_YEAR = new Date().getFullYear();

type Mode = "select" | "create";

export function FleetAddVesselModal({
  fleetId,
  onClose,
}: {
  fleetId: Id<"fleets">;
  onClose: () => void;
}) {
  const { mode } = useTheme();
  const [panelMode, setPanelMode] = useState<Mode>("select");
  const [selectedVesselId, setSelectedVesselId] = useState<Id<"vessels"> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create-new-vessel form state
  const [name, setName] = useState("");
  const [make, setMake] = useState("");
  const [vesselModel, setVesselModel] = useState("");
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [vesselType, setVesselType] = useState("");

  const vessels = useQuery(a.vessels.listMyVessels);
  const addVesselToFleet = useMutation(a.fleets.addVesselToFleet);
  const createVessel = useMutation(a.vessels.createVessel);

  const available = (vessels ?? []).filter((v: any) => !v.fleetId);

  const isDark = mode === "dark";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
  const divider = isDark ? "border-white/10" : "border-gray-200";
  const inputBase = `w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors ${
    isDark
      ? "bg-white/[0.04] border-white/[0.10] text-white placeholder-white/30 focus:border-captain-500/60 focus:bg-white/[0.06]"
      : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-captain-400"
  }`;

  async function handleAddExisting() {
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

  async function handleCreateAndAdd() {
    if (!name.trim() || !make.trim() || !vesselModel.trim() || !vesselType || !year) return;
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > CURRENT_YEAR + 1) {
      setError("Please enter a valid year.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { vesselId } = await createVessel({
        name: name.trim(),
        make: make.trim(),
        model: vesselModel.trim(),
        year: yearNum,
        vesselType,
      });
      await addVesselToFleet({ vesselId, fleetId });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Failed to create vessel");
    } finally {
      setLoading(false);
    }
  }

  const createReady = name.trim() && make.trim() && vesselModel.trim() && vesselType && year;

  return (
    <GlassModal onClose={onClose} className="max-w-lg p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className={`text-lg font-bold font-heading ${textPrimary}`}>Add Vessel to Fleet</h2>
        <button onClick={onClose} className={`text-2xl leading-none transition-colors ${isDark ? "text-white/30 hover:text-white" : "text-gray-300 hover:text-gray-700"}`}>×</button>
      </div>

      {/* Tab switcher */}
      <div className={`flex rounded-xl p-1 mb-5 ${isDark ? "bg-white/[0.04]" : "bg-gray-100"}`}>
        <button
          onClick={() => { setPanelMode("select"); setError(null); }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            panelMode === "select"
              ? isDark ? "bg-white/[0.08] text-white" : "bg-white text-gray-900 shadow-sm"
              : isDark ? "text-white/40 hover:text-white/70" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Existing Vessel
        </button>
        <button
          onClick={() => { setPanelMode("create"); setError(null); }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            panelMode === "create"
              ? isDark ? "bg-white/[0.08] text-white" : "bg-white text-gray-900 shadow-sm"
              : isDark ? "text-white/40 hover:text-white/70" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          + New Vessel
        </button>
      </div>

      {panelMode === "select" ? (
        <div className="space-y-4">
          <p className={`text-sm ${textSecondary}`}>
            Select one of your vessels to add to this fleet.
          </p>

          {vessels === undefined ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-captain-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : available.length === 0 ? (
            <div className={`text-center py-8 text-sm ${textSecondary}`}>
              No unassigned vessels found.{" "}
              <button
                onClick={() => setPanelMode("create")}
                className="text-captain-400 hover:text-captain-300 underline"
              >
                Create one now.
              </button>
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
                      ? isDark ? "bg-captain-500/15" : "bg-captain-50"
                      : isDark ? "hover:bg-white/[0.04]" : "hover:bg-gray-50"
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

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <GlassButton
              variant="primary"
              onClick={handleAddExisting}
              disabled={!selectedVesselId || loading}
              className="flex-1"
            >
              {loading ? "Adding…" : "Add to Fleet"}
            </GlassButton>
            <GlassButton variant="ghost" onClick={onClose}>Cancel</GlassButton>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className={`text-sm ${textSecondary}`}>
            Create a new vessel and add it to this fleet immediately.
          </p>

          <div className="space-y-3">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${textSecondary}`}>Vessel Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sea Breeze"
                className={inputBase}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${textSecondary}`}>Make *</label>
                <input
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  placeholder="e.g. Grady-White"
                  className={inputBase}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${textSecondary}`}>Model *</label>
                <input
                  value={vesselModel}
                  onChange={(e) => setVesselModel(e.target.value)}
                  placeholder="e.g. Freedom 285"
                  className={inputBase}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${textSecondary}`}>Year *</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  min={1900}
                  max={CURRENT_YEAR + 1}
                  className={inputBase}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${textSecondary}`}>Type *</label>
                <select
                  value={vesselType}
                  onChange={(e) => setVesselType(e.target.value)}
                  className={inputBase}
                >
                  <option value="">Select type…</option>
                  {VESSEL_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <GlassButton
              variant="primary"
              onClick={handleCreateAndAdd}
              disabled={!createReady || loading}
              className="flex-1"
            >
              {loading ? "Creating…" : "Create & Add to Fleet"}
            </GlassButton>
            <GlassButton variant="ghost" onClick={onClose}>Cancel</GlassButton>
          </div>
        </div>
      )}
    </GlassModal>
  );
}
