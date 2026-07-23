"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { GlassCard, GlassButton } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";
import { FleetCreateModal } from "./fleet-create-modal";
import { FleetVesselTable } from "./fleet-vessel-table";
import { FleetSettingsPanel } from "./fleet-settings-panel";
import { FleetAddVesselModal } from "./fleet-add-vessel-modal";

// ──────────────────────────────────────────────
// Stat tile
// ──────────────────────────────────────────────
function StatTile({
  label,
  value,
  sub,
  accent,
  onClick,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: "green" | "yellow" | "red" | "blue" | "gray";
  onClick?: () => void;
}) {
  const { mode } = useTheme();
  const accentMap = {
    green: mode === "dark" ? "text-emerald-400" : "text-emerald-600",
    yellow: mode === "dark" ? "text-amber-400" : "text-amber-600",
    red: mode === "dark" ? "text-red-400" : "text-red-600",
    blue: mode === "dark" ? "text-captain-400" : "text-captain-600",
    gray: mode === "dark" ? "text-gray-400" : "text-gray-500",
  };
  const valueColor = accent ? accentMap[accent] : (mode === "dark" ? "text-white" : "text-gray-900");

  return (
    <GlassCard
      interactive={!!onClick}
      onClick={onClick}
      className="p-5"
    >
      <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${mode === "dark" ? "text-gray-400" : "text-gray-500"}`}>
        {label}
      </p>
      <p className={`text-3xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${mode === "dark" ? "text-gray-500" : "text-gray-400"}`}>{sub}</p>}
    </GlassCard>
  );
}

// ──────────────────────────────────────────────
// Health score ring
// ──────────────────────────────────────────────
function HealthRing({ score }: { score: number }) {
  const { mode } = useTheme();
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <GlassCard className="p-6 flex flex-col items-center gap-2">
      <svg width="108" height="108" viewBox="0 0 108 108">
        <circle cx="54" cy="54" r={r} fill="none" strokeWidth="10" stroke={mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"} />
        <circle
          cx="54" cy="54" r={r} fill="none" strokeWidth="10"
          stroke={color} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ / 4}
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)" }}
        />
        <text x="54" y="54" textAnchor="middle" dominantBaseline="middle" fontSize="22" fontWeight="700" fill={color}>{score}%</text>
      </svg>
      <p className={`text-sm font-medium ${mode === "dark" ? "text-gray-300" : "text-gray-600"}`}>Fleet Health</p>
      <p className={`text-xs ${mode === "dark" ? "text-gray-500" : "text-gray-400"}`}>
        {score >= 80 ? "All systems running well" : score >= 60 ? "Some vessels need attention" : "Immediate action required"}
      </p>
    </GlassCard>
  );
}

// ──────────────────────────────────────────────
// Alert strip
// ──────────────────────────────────────────────
function AlertStrip({ label, count, severity }: { label: string; count: number; severity: "red" | "yellow" | "blue" }) {
  const { mode } = useTheme();
  if (count === 0) return null;
  const colors = {
    red: mode === "dark" ? "bg-red-500/10 border-red-500/20 text-red-300" : "bg-red-50 border-red-200 text-red-700",
    yellow: mode === "dark" ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-700",
    blue: mode === "dark" ? "bg-captain-500/10 border-captain-500/20 text-captain-300" : "bg-captain-50 border-captain-200 text-captain-700",
  };
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${colors[severity]}`}>
      <span className="text-lg font-bold tabular-nums">{count}</span>
      <span>{label}</span>
    </div>
  );
}

// ──────────────────────────────────────────────
// Fleet selector
// ──────────────────────────────────────────────
function FleetSelector({
  fleets,
  selectedId,
  onSelect,
  onCreateNew,
}: {
  fleets: Array<{ _id: Id<"fleets">; name: string; vesselCount: number }>;
  selectedId: Id<"fleets"> | null;
  onSelect: (id: Id<"fleets">) => void;
  onCreateNew: () => void;
}) {
  const { mode } = useTheme();
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {fleets.map((f) => (
        <button
          key={f._id}
          onClick={() => onSelect(f._id)}
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
            selectedId === f._id
              ? mode === "dark"
                ? "bg-captain-500/20 border-captain-500/40 text-captain-300"
                : "bg-captain-600 border-captain-600 text-white"
              : mode === "dark"
              ? "border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
              : "border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900"
          }`}
        >
          {f.name}
          <span className={`ml-2 text-xs ${selectedId === f._id ? "opacity-80" : "opacity-50"}`}>
            {f.vesselCount}v
          </span>
        </button>
      ))}
      <button
        onClick={onCreateNew}
        className={`px-4 py-2 rounded-full text-sm font-medium border border-dashed transition-all ${
          mode === "dark"
            ? "border-white/20 text-gray-500 hover:border-white/40 hover:text-gray-300"
            : "border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600"
        }`}
      >
        + New Fleet
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main dashboard
// ──────────────────────────────────────────────
export function FleetDashboard() {
  const { mode } = useTheme();
  const [selectedFleetId, setSelectedFleetId] = useState<Id<"fleets"> | null>(null);
  const [showCreateFleet, setShowCreateFleet] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddVessel, setShowAddVessel] = useState(false);

  const a = api as any;
  const fleetList = useQuery(a.fleetDashboard.listAllFleetsDashboard);
  const dashboard = useQuery(
    a.fleetDashboard.getFleetDashboard,
    selectedFleetId ? { fleetId: selectedFleetId } : "skip"
  );

  // Auto-select first fleet
  if (fleetList && fleetList.length > 0 && !selectedFleetId) {
    setSelectedFleetId(fleetList[0]._id);
  }

  const isLoading = fleetList === undefined;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-8">
          <Link
            href="/home"
            className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
              mode === "dark" ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-captain-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (fleetList.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Back nav — always visible so user is never stranded */}
        <div className="mb-8">
          <Link
            href="/home"
            className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
              mode === "dark"
                ? "text-gray-400 hover:text-white"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-24 px-4">
          <div className={`text-center max-w-md ${mode === "dark" ? "text-gray-300" : "text-gray-600"}`}>
            <div className="text-6xl mb-4">⚓</div>
            <h2 className={`text-2xl font-bold mb-2 font-heading ${mode === "dark" ? "text-white" : "text-gray-900"}`}>
              No Fleets Yet
            </h2>
            <p className="mb-6">
              Create your first fleet to start tracking vessels, managing mechanics, and monitoring service across your entire operation.
            </p>
            <GlassButton variant="primary" onClick={() => setShowCreateFleet(true)}>
              Create Your First Fleet
            </GlassButton>
          </div>
        </div>

        {showCreateFleet && (
          <FleetCreateModal
            onSuccess={(id) => { setSelectedFleetId(id); setShowCreateFleet(false); }}
            onClose={() => setShowCreateFleet(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className={`text-2xl font-bold font-heading ${mode === "dark" ? "text-white" : "text-gray-900"}`}>
            Fleet Command Center
          </h1>
          <p className={`text-sm mt-0.5 ${mode === "dark" ? "text-gray-400" : "text-gray-500"}`}>
            Real-time health and service status across your fleet
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedFleetId && (
            <button
              onClick={() => setShowSettings(true)}
              className={`p-2.5 rounded-xl border transition-all ${mode === "dark" ? "border-white/10 text-gray-400 hover:text-white hover:border-white/20" : "border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300"}`}
              title="Fleet settings"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          <GlassButton variant="secondary" onClick={() => setShowCreateFleet(true)}>
            + New Fleet
          </GlassButton>
        </div>
      </div>

      {/* Fleet selector */}
      <FleetSelector
        fleets={fleetList}
        selectedId={selectedFleetId}
        onSelect={setSelectedFleetId}
        onCreateNew={() => setShowCreateFleet(true)}
      />

      {dashboard === undefined && selectedFleetId && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-captain-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {dashboard && (
        <>
          {/* Alert strips */}
          <div className="flex flex-wrap gap-3">
            <AlertStrip label="vessels overdue for service" count={dashboard.overdueCount} severity="red" />
            <AlertStrip label="vessels approaching service" count={dashboard.approachingCount} severity="yellow" />
            <AlertStrip label="vessels out of service" count={dashboard.outOfServiceCount} severity="red" />
            <AlertStrip label="missing insurance" count={dashboard.insuranceMissing} severity="yellow" />
            <AlertStrip label="insurance expiring soon" count={dashboard.insuranceExpiringSoon} severity="yellow" />
            <AlertStrip label="vessels without mechanic" count={dashboard.uncoveredVessels} severity="blue" />
          </div>

          {/* Top stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2 md:col-span-1">
              <HealthRing score={dashboard.healthScore} />
            </div>
            <StatTile
              label="In Service"
              value={dashboard.inServiceCount}
              sub={`of ${dashboard.totalVessels} vessels`}
              accent="green"
              onClick={() => setActiveFilter("in_service")}
            />
            <StatTile
              label="In Maintenance"
              value={dashboard.inMaintenanceCount}
              accent={dashboard.inMaintenanceCount > 0 ? "yellow" : "gray"}
              onClick={() => setActiveFilter("in_maintenance")}
            />
            <StatTile
              label="Out of Service"
              value={dashboard.outOfServiceCount}
              accent={dashboard.outOfServiceCount > 0 ? "red" : "gray"}
              onClick={() => setActiveFilter("out_of_service")}
            />
          </div>

          {/* Second stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatTile
              label="Open Work Orders"
              value={dashboard.totalOpenWorkOrders}
              accent={dashboard.totalOpenWorkOrders > 0 ? "blue" : "gray"}
              onClick={() => setActiveFilter("work_orders")}
            />
            <StatTile
              label="Service Overdue"
              value={dashboard.overdueCount}
              accent={dashboard.overdueCount > 0 ? "red" : "gray"}
              onClick={() => setActiveFilter("overdue")}
            />
            <StatTile
              label="Service Approaching"
              value={dashboard.approachingCount}
              accent={dashboard.approachingCount > 0 ? "yellow" : "gray"}
              onClick={() => setActiveFilter("approaching")}
            />
            <StatTile
              label="Warranties Expiring"
              value={dashboard.warrantyExpiringSoon}
              sub="within 90 days"
              accent={dashboard.warrantyExpiringSoon > 0 ? "yellow" : "gray"}
            />
          </div>

          {/* Insurance row */}
          {(dashboard.insuranceMissing > 0 || dashboard.insuranceExpiringSoon > 0) && (
            <GlassCard className="p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className={`flex items-center gap-2 text-sm ${mode === "dark" ? "text-amber-300" : "text-amber-700"}`}>
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="font-medium">Insurance Alert:</span>
                </div>
                {dashboard.insuranceMissing > 0 && (
                  <span className={`text-sm ${mode === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                    <strong>{dashboard.insuranceMissing}</strong> vessel{dashboard.insuranceMissing > 1 ? "s" : ""} {dashboard.insuranceMissing > 1 ? "have" : "has"} no insurance on file.
                  </span>
                )}
                {dashboard.insuranceExpiringSoon > 0 && (
                  <span className={`text-sm ${mode === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                    <strong>{dashboard.insuranceExpiringSoon}</strong> vessel{dashboard.insuranceExpiringSoon > 1 ? "s" : ""} {dashboard.insuranceExpiringSoon > 1 ? "have" : "has"} insurance expiring within 30 days.
                  </span>
                )}
              </div>
            </GlassCard>
          )}

          {/* Vessel table */}
          <div className="space-y-3">
            <div className="flex justify-end">
              <GlassButton variant="secondary" onClick={() => setShowAddVessel(true)}>
                + Add Vessel
              </GlassButton>
            </div>
            <FleetVesselTable
              vessels={dashboard.vessels}
              fleetId={selectedFleetId!}
              activeFilter={activeFilter}
              onClearFilter={() => setActiveFilter(null)}
            />
          </div>
        </>
      )}

      {showCreateFleet && (
        <FleetCreateModal
          onSuccess={(id) => { setSelectedFleetId(id); setShowCreateFleet(false); }}
          onClose={() => setShowCreateFleet(false)}
        />
      )}

      {showSettings && selectedFleetId && (
        <FleetSettingsPanel
          fleetId={selectedFleetId}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showAddVessel && selectedFleetId && (
        <FleetAddVesselModal
          fleetId={selectedFleetId}
          onClose={() => setShowAddVessel(false)}
        />
      )}
    </div>
  );
}
