"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { GlassCard, GlassButton, GlassInput, GlassModal } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";

const FLEET_TYPES = [
  { value: "charter", label: "Charter" },
  { value: "fishing", label: "Fishing" },
  { value: "racing", label: "Racing" },
  { value: "leisure", label: "Leisure" },
  { value: "commercial", label: "Commercial" },
] as const;

type FleetType = typeof FLEET_TYPES[number]["value"];

export function FleetCreateModal({
  onSuccess,
  onClose,
}: {
  onSuccess: (id: Id<"fleets">) => void;
  onClose: () => void;
}) {
  const { mode } = useTheme();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createFleet = useMutation((api as any).fleets.createFleet);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fleetType, setFleetType] = useState<FleetType | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Fleet name is required"); return; }
    setError(null);
    setSubmitting(true);
    try {
      const { fleetId } = await createFleet({
        name: name.trim(),
        description: description.trim() || undefined,
        fleetType: fleetType || undefined,
      });
      onSuccess(fleetId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create fleet");
    } finally {
      setSubmitting(false);
    }
  };

  const labelClass = `block text-xs font-medium uppercase tracking-wider mb-1.5 ${mode === "dark" ? "text-gray-400" : "text-gray-500"}`;
  const selectClass = `w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-all ${
    mode === "dark"
      ? "bg-white/5 border-white/10 text-white focus:border-captain-500/50 focus:bg-white/8"
      : "bg-white border-gray-200 text-gray-900 focus:border-captain-400 focus:ring-2 focus:ring-captain-100"
  }`;

  return (
    <GlassModal onClose={onClose}>
      <div className="w-full max-w-md">
        <h2 className={`text-xl font-bold font-heading mb-1 ${mode === "dark" ? "text-white" : "text-gray-900"}`}>
          Create a Fleet
        </h2>
        <p className={`text-sm mb-6 ${mode === "dark" ? "text-gray-400" : "text-gray-500"}`}>
          Group your vessels into a fleet for unified management and service tracking.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Fleet Name *</label>
            <GlassInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Gulf Coast Charters"
              maxLength={100}
              autoFocus
            />
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional — a short description of this fleet"
              maxLength={500}
              rows={2}
              className={`${selectClass} resize-none`}
            />
          </div>

          <div>
            <label className={labelClass}>Fleet Type</label>
            <select
              value={fleetType}
              onChange={(e) => setFleetType(e.target.value as FleetType | "")}
              className={selectClass}
            >
              <option value="">Select type (optional)</option>
              {FLEET_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <GlassButton
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </GlassButton>
            <GlassButton
              type="submit"
              variant="primary"
              disabled={submitting || !name.trim()}
              className="flex-1"
            >
              {submitting ? "Creating…" : "Create Fleet"}
            </GlassButton>
          </div>
        </form>
      </div>
    </GlassModal>
  );
}
