"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { GlassModal, GlassCard, GlassButton, GlassInput, GlassSelect } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";

const a = api as any;

type Tab = "info" | "mechanics" | "danger";

export function FleetSettingsPanel({
  fleetId,
  onClose,
}: {
  fleetId: Id<"fleets">;
  onClose: () => void;
}) {
  const { mode } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("info");

  const isDark = mode === "dark";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-400" : "text-gray-500";

  const tabs: { id: Tab; label: string }[] = [
    { id: "info", label: "Info" },
    { id: "mechanics", label: "Mechanics" },
    { id: "danger", label: "Danger Zone" },
  ];

  return (
    <GlassModal onClose={onClose} className="max-w-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className={`text-lg font-bold font-heading ${isDark ? "text-white" : "text-gray-900"}`}>Fleet Settings</h2>
        <button onClick={onClose} className={`text-2xl leading-none transition-colors ${isDark ? "text-white/30 hover:text-white" : "text-gray-300 hover:text-gray-700"}`}>×</button>
      </div>
      {/* Tab bar */}
      <div className={`flex border-b mb-5 ${isDark ? "border-white/10" : "border-gray-200"}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? isDark
                  ? "border-captain-400 text-captain-300"
                  : "border-captain-600 text-captain-700"
                : isDark
                ? "border-transparent text-gray-400 hover:text-gray-200"
                : "border-transparent text-gray-500 hover:text-gray-700"
            } ${tab.id === "danger" ? (isDark ? "text-red-400 hover:text-red-300" : "text-red-500 hover:text-red-600") : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "info" && <InfoTab fleetId={fleetId} isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} />}
      {activeTab === "mechanics" && <MechanicsTab fleetId={fleetId} isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} />}
      {activeTab === "danger" && <DangerTab fleetId={fleetId} onClose={onClose} isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} />}
    </GlassModal>
  );
}

function InfoTab({ fleetId, isDark, textPrimary, textSecondary }: { fleetId: Id<"fleets">; isDark: boolean; textPrimary: string; textSecondary: string }) {
  const fleet = useQuery(a.fleets.getFleet, { fleetId });
  const updateFleet = useMutation(a.fleets.updateFleet);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fleetType, setFleetType] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [initialized, setInitialized] = useState(false);

  if (fleet === undefined) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-captain-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (fleet && !initialized) {
    setName(fleet.name ?? "");
    setDescription(fleet.description ?? "");
    setFleetType(fleet.fleetType ?? "");
    setInitialized(true);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await updateFleet({ fleetId, name, description: description || undefined, fleetType: fleetType || undefined });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <GlassInput label="Fleet Name" value={name} onChange={(e) => setName(e.target.value)} />
      <GlassInput label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
      <GlassSelect
        label="Fleet Type"
        value={fleetType}
        onChange={(e) => setFleetType(e.target.value)}
        options={[
          { value: "", label: "Select type…" },
          { value: "charter", label: "Charter" },
          { value: "fishing", label: "Fishing" },
          { value: "racing", label: "Racing" },
          { value: "leisure", label: "Leisure" },
          { value: "commercial", label: "Commercial" },
        ]}
      />
      <div className="flex items-center gap-3 pt-1">
        <GlassButton variant="primary" onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? "Saving…" : "Save Changes"}
        </GlassButton>
        {saved && <span className={`text-sm text-emerald-500`}>Saved!</span>}
      </div>
    </div>
  );
}

function MechanicsTab({ fleetId, isDark, textPrimary, textSecondary }: { fleetId: Id<"fleets">; isDark: boolean; textPrimary: string; textSecondary: string }) {
  const fleet = useQuery(a.fleets.getFleet, { fleetId });
  const authorizeMechanic = useMutation(a.fleets.authorizeMechanicForFleet);
  const revokeMechanic = useMutation(a.fleets.revokeMechanicFromFleet);

  const [mechanicSearch, setMechanicSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [revoking, setRevoking] = useState<Id<"users"> | null>(null);
  const [authorizing, setAuthorizing] = useState<Id<"users"> | null>(null);

  const searchMechanics = useQuery(
    a.mechanicDirectory.searchMechanics,
    mechanicSearch.trim().length >= 2 ? { searchTerm: mechanicSearch.trim() } : "skip"
  );

  const divider = isDark ? "border-white/10" : "border-gray-200";

  async function handleRevoke(mechanicId: Id<"users">) {
    setRevoking(mechanicId);
    try {
      await revokeMechanic({ fleetId, mechanicId });
    } finally {
      setRevoking(null);
    }
  }

  async function handleAuthorize(mechanicId: Id<"users">) {
    setAuthorizing(mechanicId);
    try {
      await authorizeMechanic({ fleetId, mechanicId });
    } finally {
      setAuthorizing(null);
    }
  }

  const currentMechanics: any[] = fleet?.mechanics ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h3 className={`text-sm font-semibold mb-3 ${textPrimary}`}>Authorized Mechanics</h3>
        {fleet === undefined ? (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-captain-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : currentMechanics.length === 0 ? (
          <p className={`text-sm ${textSecondary}`}>No mechanics authorized yet.</p>
        ) : (
          <GlassCard className={`p-0 overflow-hidden`}>
            {currentMechanics.map((m: any, i: number) => (
              <div key={m._id} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? `border-t ${divider}` : ""}`}>
                <div>
                  <p className={`text-sm font-medium ${textPrimary}`}>{m.firstName} {m.lastName}</p>
                  {m.companyName && <p className={`text-xs ${textSecondary}`}>{m.companyName}</p>}
                </div>
                <GlassButton
                  variant="ghost"
                  className="text-xs py-1.5 px-3 text-red-400 hover:text-red-300"
                  onClick={() => handleRevoke(m._id)}
                  disabled={revoking === m._id}
                >
                  {revoking === m._id ? "Revoking…" : "Revoke"}
                </GlassButton>
              </div>
            ))}
          </GlassCard>
        )}
      </div>

      <div>
        <h3 className={`text-sm font-semibold mb-3 ${textPrimary}`}>Add Mechanic</h3>
        <GlassInput
          label="Search by name or company"
          value={mechanicSearch}
          onChange={(e) => setMechanicSearch(e.target.value)}
          placeholder="Type at least 2 characters…"
        />
        {searchMechanics && searchMechanics.length > 0 && (
          <GlassCard className="p-0 overflow-hidden mt-2">
            {searchMechanics.map((m: any, i: number) => {
              const isAlreadyAdded = currentMechanics.some((cm: any) => cm._id === m._id);
              return (
                <div key={m._id} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? `border-t ${divider}` : ""}`}>
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>{m.firstName} {m.lastName}</p>
                    {m.companyName && <p className={`text-xs ${textSecondary}`}>{m.companyName}</p>}
                  </div>
                  {isAlreadyAdded ? (
                    <span className={`text-xs ${textSecondary}`}>Already added</span>
                  ) : (
                    <GlassButton
                      variant="secondary"
                      className="text-xs py-1.5 px-3"
                      onClick={() => handleAuthorize(m._id)}
                      disabled={authorizing === m._id}
                    >
                      {authorizing === m._id ? "Adding…" : "Add"}
                    </GlassButton>
                  )}
                </div>
              );
            })}
          </GlassCard>
        )}
        {mechanicSearch.trim().length >= 2 && searchMechanics && searchMechanics.length === 0 && (
          <p className={`text-sm mt-2 ${textSecondary}`}>No mechanics found.</p>
        )}
      </div>
    </div>
  );
}

function DangerTab({ fleetId, onClose, isDark, textPrimary, textSecondary }: { fleetId: Id<"fleets">; onClose: () => void; isDark: boolean; textPrimary: string; textSecondary: string }) {
  const deleteFleet = useMutation(a.fleets.deleteFleet);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteFleet({ fleetId });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete fleet");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-4 ${isDark ? "border-red-500/30 bg-red-500/5" : "border-red-200 bg-red-50"}`}>
        <h3 className={`text-sm font-semibold mb-1 ${isDark ? "text-red-300" : "text-red-700"}`}>Delete Fleet</h3>
        <p className={`text-sm mb-4 ${isDark ? "text-red-300/70" : "text-red-600/80"}`}>
          This permanently removes the fleet. Vessels in this fleet will be unassigned but not deleted.
        </p>

        {!confirming ? (
          <GlassButton
            variant="ghost"
            className="text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/60"
            onClick={() => setConfirming(true)}
          >
            Delete Fleet
          </GlassButton>
        ) : (
          <div className="space-y-3">
            <p className={`text-sm font-medium ${isDark ? "text-red-300" : "text-red-700"}`}>
              Are you sure? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <GlassButton
                variant="ghost"
                className="text-red-400 border border-red-500/40 hover:bg-red-500/10"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Yes, Delete"}
              </GlassButton>
              <GlassButton variant="ghost" onClick={() => setConfirming(false)} disabled={deleting}>
                Cancel
              </GlassButton>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
      </div>
    </div>
  );
}
