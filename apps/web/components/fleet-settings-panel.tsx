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
  initialTab = "info",
}: {
  fleetId: Id<"fleets">;
  onClose: () => void;
  initialTab?: Tab;
}) {
  const { mode } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

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
  const [revoking, setRevoking] = useState<Id<"users"> | null>(null);
  const [authorizing, setAuthorizing] = useState<Id<"users"> | null>(null);

  const hasSearch = mechanicSearch.trim().length >= 2;

  // Live search results when user types 2+ chars
  const searchResults = useQuery(
    a.mechanicDirectory.searchMechanics,
    hasSearch ? { searchTerm: mechanicSearch.trim() } : "skip"
  );

  // Full browse list when no search term
  const allMechanics = useQuery(
    a.mechanicDirectory.listAllMechanicsForFleet,
    !hasSearch ? {} : "skip"
  );

  const displayList: any[] = hasSearch ? (searchResults ?? []) : (allMechanics ?? []);
  const isLoading = hasSearch ? searchResults === undefined : allMechanics === undefined;

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
          <GlassCard className="p-0 overflow-hidden">
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
        <h3 className={`text-sm font-semibold mb-1 ${textPrimary}`}>Add Mechanic</h3>
        <p className={`text-xs mb-3 ${textSecondary}`}>
          {hasSearch ? `Showing results for "${mechanicSearch.trim()}"` : "All registered mechanics — scroll to browse or search by name."}
        </p>
        <GlassInput
          value={mechanicSearch}
          onChange={(e) => setMechanicSearch(e.target.value)}
          placeholder="Search by name or company…"
        />

        <div className={`mt-2 rounded-xl border overflow-hidden max-h-64 overflow-y-auto ${isDark ? "border-white/10" : "border-gray-200"}`}>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-captain-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : displayList.length === 0 ? (
            <p className={`text-sm text-center py-6 ${textSecondary}`}>
              {hasSearch ? "No mechanics match that search." : "No mechanics registered yet."}
            </p>
          ) : (
            displayList.map((m: any, i: number) => {
              const isAlreadyAdded = currentMechanics.some((cm: any) => cm._id === m._id);
              return (
                <div key={m._id} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? `border-t ${divider}` : ""} ${isDark ? "bg-white/2" : "bg-white"}`}>
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>{m.firstName} {m.lastName}</p>
                    {m.companyName && <p className={`text-xs ${textSecondary}`}>{m.companyName}</p>}
                  </div>
                  {isAlreadyAdded ? (
                    <span className={`text-xs ${textSecondary}`}>Added</span>
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
            })
          )}
        </div>
      </div>
    </div>
  );
}

function DangerTab({ fleetId, onClose, isDark, textPrimary, textSecondary }: { fleetId: Id<"fleets">; onClose: () => void; isDark: boolean; textPrimary: string; textSecondary: string }) {
  const fleet = useQuery(a.fleets.getFleet, { fleetId });
  const requestDeletion = useMutation(a.fleets.requestFleetDeletion);
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alreadyRequested = !!(fleet?.deletionRequestedAt);

  async function handleRequest() {
    setSubmitting(true);
    setError(null);
    try {
      await requestDeletion({ fleetId, reason: reason.trim() || undefined });
      setSubmitted(true);
    } catch (e: any) {
      setError(e?.message ?? "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-4 ${isDark ? "border-red-500/30 bg-red-500/5" : "border-red-200 bg-red-50"}`}>
        <h3 className={`text-sm font-semibold mb-1 ${isDark ? "text-red-300" : "text-red-700"}`}>Request Fleet Deletion</h3>
        <p className={`text-sm mb-4 ${isDark ? "text-red-300/70" : "text-red-600/80"}`}>
          Fleet deletion must be approved by a QR Captain admin. Submit a request below and our team will follow up within 1–2 business days. Vessels will be unassigned but not deleted.
        </p>

        {alreadyRequested || submitted ? (
          <div className={`rounded-lg p-3 text-sm ${isDark ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-300" : "bg-yellow-50 border border-yellow-200 text-yellow-800"}`}>
            ✓ Deletion request submitted. An admin will review and contact you.
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className={`block text-xs font-medium mb-1 ${isDark ? "text-red-300/70" : "text-red-600"}`}>
                Reason (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why do you want to delete this fleet?"
                rows={3}
                className={`w-full rounded-lg px-3 py-2 text-sm resize-none outline-none transition-colors ${
                  isDark
                    ? "bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-red-500/40"
                    : "bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-red-300"
                }`}
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <GlassButton
              variant="ghost"
              className="text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/60"
              onClick={handleRequest}
              disabled={submitting}
            >
              {submitting ? "Submitting…" : "Submit Deletion Request"}
            </GlassButton>
          </div>
        )}
      </div>
    </div>
  );
}
