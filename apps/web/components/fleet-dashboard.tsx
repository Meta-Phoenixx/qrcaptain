"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { GlassButton } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";
import { FleetCreateModal } from "./fleet-create-modal";
import { FleetVesselTable } from "./fleet-vessel-table";
import { FleetSettingsPanel } from "./fleet-settings-panel";
import { FleetAddVesselModal } from "./fleet-add-vessel-modal";

// ─── Arc helper for SVG donuts ────────────────────────────────────────────────
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const toRad = (d: number) => ((d - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

// ─── Fleet health donut ───────────────────────────────────────────────────────
function HealthDonut({ score, trend }: { score: number; trend?: number }) {
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "Good" : score >= 60 ? "Fair" : "Critical";
  const end = Math.min((score / 100) * 359.99, 359.99);
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium mb-1 text-center">Fleet Health Score</p>
      <svg width="110" height="110" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="46" fill="none" strokeWidth="10" stroke="rgba(255,255,255,0.06)" />
        {score > 0 && (
          <path d={arcPath(60, 60, 46, 0, end)} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
        )}
        <text x="60" y="56" textAnchor="middle" fontSize="22" fontWeight="700" fill={color}>{score}%</text>
        <text x="60" y="72" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.5)">{label}</text>
      </svg>
      {trend != null && (
        <p className={`text-[10px] font-medium ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}% vs last 30 days
        </p>
      )}
    </div>
  );
}

// ─── Top KPI tile ─────────────────────────────────────────────────────────────
function KpiTile({ value, label, sub, color, onClick }: {
  value: number | string; label: string; sub?: string;
  color: "green" | "yellow" | "red" | "blue" | "gray"; onClick?: () => void;
}) {
  const colorMap = { green: "text-emerald-400", yellow: "text-amber-400", red: "text-red-400", blue: "text-captain-400", gray: "text-white/40" };
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center px-3 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] transition-colors text-center min-w-0">
      <span className={`text-2xl sm:text-3xl font-bold tabular-nums leading-none ${colorMap[color]}`}>{value}</span>
      <span className={`text-[10px] sm:text-[11px] font-medium mt-1 leading-tight ${colorMap[color]}`}>{label}</span>
      {sub && <span className="text-[9px] sm:text-[10px] text-white/30 mt-0.5 leading-tight">{sub}</span>}
    </button>
  );
}

// ─── Multi-segment fleet overview donut ──────────────────────────────────────
function FleetOverviewDonut({ total, inService, inMaintenance, approaching, overdue, onFilter }: {
  total: number; inService: number; inMaintenance: number; approaching: number; overdue: number;
  onFilter: (f: string) => void;
}) {
  if (total === 0) return <div className="w-32 h-32 rounded-full bg-white/[0.04] flex items-center justify-center text-white/20 text-xs">No vessels</div>;
  const segments = [
    { value: inService,     color: "#10b981", label: "In Service",         key: "in_service"     },
    { value: inMaintenance, color: "#f59e0b", label: "In Maintenance",     key: "in_maintenance" },
    { value: approaching,   color: "#f97316", label: "Service Due Soon",   key: "approaching"    },
    { value: overdue,       color: "#ef4444", label: "Overdue / Out of Srvc", key: "overdue"    },
  ].filter((s) => s.value > 0);
  let startDeg = 0;
  const arcs = segments.map((seg) => {
    const sweep = (seg.value / total) * 359.99;
    const path = arcPath(70, 70, 55, startDeg, startDeg + sweep);
    startDeg += sweep;
    return { ...seg, path };
  });
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
      <div className="flex-shrink-0">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="55" fill="none" strokeWidth="15" stroke="rgba(255,255,255,0.05)" />
          {arcs.map((arc, i) => <path key={i} d={arc.path} fill="none" stroke={arc.color} strokeWidth="15" strokeLinecap="butt" />)}
          <text x="70" y="64" textAnchor="middle" fontSize="26" fontWeight="700" fill="white">{total}</text>
          <text x="70" y="79" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)">TOTAL</text>
          <text x="70" y="90" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)">VESSELS</text>
        </svg>
      </div>
      <div className="flex flex-col gap-2.5 w-full sm:min-w-0">
        {[
          { value: inService,     color: "#10b981", label: "In Service",       key: "in_service"     },
          { value: inMaintenance, color: "#f59e0b", label: "In Maintenance",   key: "in_maintenance" },
          { value: approaching,   color: "#f97316", label: "Service Due Soon", key: "approaching"    },
          { value: overdue,       color: "#ef4444", label: "Overdue / Out",    key: "overdue"        },
        ].map((s) => (
          <button key={s.key} onClick={() => onFilter(s.key)} className="flex items-center gap-2.5 text-left hover:opacity-80 transition-opacity">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-xs text-white/60 flex-1">{s.label}</span>
            <span className="text-xs font-semibold text-white tabular-nums">{s.value}</span>
            <span className="text-[10px] text-white/30 w-8 text-right">{Math.round((s.value / total) * 100)}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Service status donut ─────────────────────────────────────────────────────
function ServiceStatusDonut({ overdue, approaching }: { overdue: number; approaching: number }) {
  const total = overdue + approaching;
  const overdueEnd = total > 0 ? (overdue / total) * 359.99 : 0;
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
      <div className="flex-shrink-0">
        <svg width="130" height="130" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="52" fill="none" strokeWidth="13" stroke="rgba(255,255,255,0.05)" />
          {overdue > 0 && <path d={arcPath(70, 70, 52, 0, overdueEnd)} fill="none" stroke="#ef4444" strokeWidth="13" strokeLinecap="butt" />}
          {approaching > 0 && <path d={arcPath(70, 70, 52, overdueEnd, 359.99)} fill="none" stroke="#f97316" strokeWidth="13" strokeLinecap="butt" />}
          <text x="70" y="62" textAnchor="middle" fontSize="28" fontWeight="700" fill="white">{total}</text>
          <text x="70" y="77" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.4)">REQUIRE</text>
          <text x="70" y="88" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.4)">ATTENTION</text>
        </svg>
      </div>
      <div className="flex flex-row sm:flex-col gap-6 sm:gap-4">
        <div>
          <p className="text-2xl font-bold text-amber-400 tabular-nums">{approaching}</p>
          <p className="text-xs text-white/50 mt-0.5">Due Soon</p>
          <p className="text-[10px] text-white/30">within 14 days</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-red-400 tabular-nums">{overdue}</p>
          <p className="text-xs text-white/50 mt-0.5">Overdue</p>
          <p className="text-[10px] text-white/30">past due</p>
        </div>
      </div>
    </div>
  );
}

// ─── Icon stat card ───────────────────────────────────────────────────────────
function IconStat({ icon, value, label, sub, linkLabel, onLink }: {
  icon: React.ReactNode; value: number | string; label: string; sub: string; linkLabel: string; onLink?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-captain-500/15 flex items-center justify-center flex-shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] text-white/40 font-medium leading-tight">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-white tabular-nums leading-tight">{value ?? "—"}</p>
        </div>
      </div>
      <p className="text-[10px] sm:text-[11px] text-white/30">{sub}</p>
      <button onClick={onLink} className="text-[10px] sm:text-[11px] text-captain-400 hover:text-captain-300 font-medium text-left transition-colors">{linkLabel} →</button>
    </div>
  );
}

// ─── Quick actions panel ──────────────────────────────────────────────────────
function QuickActions({ onAddVessel, onSettings }: { onAddVessel: () => void; onSettings: () => void }) {
  const router = useRouter();
  const actions = [
    { label: "Create Work Order", icon: "📋", action: () => router.push("/work-orders") },
    { label: "Log Engine Hours",  icon: "⏱",  action: () => router.push("/vessels")     },
    { label: "Schedule Service",  icon: "📅", action: () => router.push("/maintenance") },
    { label: "Invite Mechanic",   icon: "👤", action: onSettings                        },
  ];
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] overflow-hidden w-full lg:w-60 lg:flex-shrink-0">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Quick Actions</p>
      </div>
      <div className="p-3 flex flex-col gap-2">
        <button onClick={onAddVessel} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-captain-500 hover:bg-captain-400 text-white text-sm font-semibold transition-colors">
          + Add Vessel
        </button>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
          {actions.map((a) => (
            <button key={a.label} onClick={a.action} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] text-white/60 hover:text-white/90 text-xs sm:text-sm transition-colors text-left">
              <span className="text-base">{a.icon}</span>
              <span className="truncate">{a.label}</span>
            </button>
          ))}
        </div>
        <div className="border-t border-white/[0.06] mt-1 pt-2">
          <button className="w-full text-xs text-captain-400 hover:text-captain-300 py-1.5 transition-colors font-medium">View All Actions →</button>
        </div>
      </div>
    </div>
  );
}

// ─── Fleet selector dropdown ──────────────────────────────────────────────────
function FleetDropdown({ fleets, selectedId, onSelect }: {
  fleets: Array<{ _id: Id<"fleets">; name: string; vesselCount: number }>;
  selectedId: Id<"fleets"> | null; onSelect: (id: Id<"fleets">) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = fleets.find((f) => f._id === selectedId);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] transition-colors text-xs sm:text-sm whitespace-nowrap">
        <span className="font-semibold text-white truncate max-w-[120px] sm:max-w-none">{selected?.name ?? "Select Fleet"}</span>
        <span className="text-white/40 text-xs">↓</span>
        {selected && <span className="text-white/40 text-xs hidden sm:inline">{selected.vesselCount} Vessels</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 rounded-xl bg-[#1a2540] border border-white/[0.1] shadow-xl z-50 overflow-hidden">
          {fleets.map((f) => (
            <button key={f._id} onClick={() => { onSelect(f._id); setOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-white/[0.06] transition-colors text-left ${selectedId === f._id ? "text-captain-400" : "text-white/80"}`}>
              <span>{f.name}</span>
              <span className="text-xs text-white/30">{f.vesselCount}v</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export function FleetDashboard() {
  const { mode } = useTheme();
  const router = useRouter();
  const [selectedFleetId, setSelectedFleetId] = useState<Id<"fleets"> | null>(null);
  const [showCreateFleet, setShowCreateFleet] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddVessel, setShowAddVessel] = useState(false);

  const a = api as any;
  const fleetList = useQuery(a.fleetDashboard.listAllFleetsDashboard);
  const dashboard = useQuery(a.fleetDashboard.getFleetDashboard, selectedFleetId ? { fleetId: selectedFleetId } : "skip");

  if (fleetList && fleetList.length > 0 && !selectedFleetId) setSelectedFleetId(fleetList[0]._id);

  if (fleetList === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-captain-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (fleetList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚓</div>
          <h2 className="text-2xl font-bold mb-2 font-heading text-white">No Fleets Yet</h2>
          <p className="text-white/50 mb-6">Create your first fleet to start tracking vessels, managing mechanics, and monitoring service.</p>
          <GlassButton variant="primary" onClick={() => setShowCreateFleet(true)}>Create Your First Fleet</GlassButton>
        </div>
        {showCreateFleet && (
          <FleetCreateModal onSuccess={(id) => { setSelectedFleetId(id); setShowCreateFleet(false); }} onClose={() => setShowCreateFleet(false)} />
        )}
      </div>
    );
  }

  const d = dashboard;

  return (
    <div className="min-h-screen px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 max-w-[1400px] mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold font-heading text-white leading-tight">Fleet Command Center</h1>
          <p className="text-xs sm:text-sm text-white/40 mt-0.5 hidden sm:block">Real-time health and service status across your fleet</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Bell */}
          <button className="relative p-2 sm:p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors text-white/50 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {d && (d.overdueCount + d.approachingCount) > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                {Math.min(d.overdueCount + d.approachingCount, 9)}
              </span>
            )}
          </button>
          {/* Settings */}
          {selectedFleetId && (
            <button onClick={() => setShowSettings(true)} className="p-2 sm:p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors text-white/50 hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          {/* New Fleet */}
          <button onClick={() => setShowCreateFleet(true)} className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-captain-500 hover:bg-captain-400 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap">
            + <span className="hidden sm:inline">New</span> Fleet
          </button>
        </div>
      </div>

      {/* ── Top KPI strip ─────────────────────────────────────────────────── */}
      {/* Mobile: health full-width, then 2x3 grid of KPIs */}
      {/* Desktop: single 7-col row */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-stretch">
        {/* Health donut — full width on mobile, fixed width on desktop */}
        <div className="flex items-center justify-center p-4 rounded-2xl bg-white/[0.04] border border-white/[0.07] lg:w-48 lg:flex-shrink-0">
          <HealthDonut score={d?.healthScore ?? 0} trend={8} />
        </div>

        {/* 5 KPI tiles: 2-col on mobile, 3-col on sm, 5-col on lg */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 flex-1">
          <KpiTile value={d?.approachingCount ?? 0} label="Service Due Soon" sub="within 14 days"
            color={d && d.approachingCount > 0 ? "yellow" : "gray"} onClick={() => setActiveFilter("approaching")} />
          <KpiTile value={d?.overdueCount ?? 0} label="Overdue" sub="needs attention"
            color={d && d.overdueCount > 0 ? "red" : "gray"} onClick={() => setActiveFilter("overdue")} />
          <KpiTile value={d?.inServiceCount ?? 0} label="In Service" sub="operational"
            color="green" onClick={() => setActiveFilter("in_service")} />
          <KpiTile value={d?.inMaintenanceCount ?? 0} label="In Maintenance" sub="in the shop"
            color={d && d.inMaintenanceCount > 0 ? "yellow" : "gray"} onClick={() => setActiveFilter("in_maintenance")} />
          <KpiTile value={d?.outOfServiceCount ?? 0} label="Out of Service" sub="not operational"
            color={d && d.outOfServiceCount > 0 ? "red" : "gray"} onClick={() => setActiveFilter("out_of_service")} />
        </div>

        {/* Fleet dropdown — below on mobile, right of KPIs on desktop */}
        <div className="flex lg:items-center">
          <FleetDropdown fleets={fleetList} selectedId={selectedFleetId} onSelect={setSelectedFleetId} />
        </div>
      </div>

      {/* Loading */}
      {!d && selectedFleetId && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-captain-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {d && (
        <>
          {/* ── Middle row: 1-col mobile → 3-col desktop ─────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Fleet Overview */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-5 flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-white">Fleet Overview</h3>
              <FleetOverviewDonut
                total={d.totalVessels} inService={d.inServiceCount} inMaintenance={d.inMaintenanceCount}
                approaching={d.approachingCount} overdue={d.overdueCount + d.outOfServiceCount}
                onFilter={setActiveFilter}
              />
              <button onClick={() => setActiveFilter(null)} className="text-xs text-captain-400 hover:text-captain-300 font-medium transition-colors text-left mt-auto">
                View All Vessels →
              </button>
            </div>

            {/* Service Status */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-5 flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-white">Service Status</h3>
              <ServiceStatusDonut overdue={d.overdueCount} approaching={d.approachingCount} />
              <button onClick={() => setActiveFilter("overdue")} className="text-xs text-captain-400 hover:text-captain-300 font-medium transition-colors text-left mt-auto">
                View Service List →
              </button>
            </div>

            {/* Maintenance Cost */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-5 flex flex-col gap-4 md:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Upcoming Maintenance Cost</h3>
                <button className="text-xs text-captain-400 hover:text-captain-300">View All</button>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-white">
                  {d.totalOpenWorkOrders > 0 ? "Quotes Pending" : "—"}
                </p>
                <p className="text-xs text-white/40 mt-1">Total Estimated</p>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                <div className="rounded-l-full bg-emerald-500" style={{ flex: Math.max(d.inServiceCount, 0.5) }} />
                <div className="bg-amber-500" style={{ flex: Math.max(d.inMaintenanceCount, 0.5) }} />
                <div className="rounded-r-full bg-red-500" style={{ flex: Math.max(d.outOfServiceCount + d.overdueCount, 0.5) }} />
              </div>
              <div className="flex flex-col gap-2">
                {[
                  { color: "bg-emerald-500", label: "In Service",       value: `${d.inServiceCount} vessels`                       },
                  { color: "bg-amber-500",   label: "Maintenance",      value: `${d.inMaintenanceCount} vessels`                   },
                  { color: "bg-red-500",     label: "Needs Attention",  value: `${d.overdueCount + d.outOfServiceCount} vessels`   },
                ].map((r) => (
                  <div key={r.label} className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-sm ${r.color} flex-shrink-0`} />
                    <span className="text-xs text-white/50 flex-1">{r.label}</span>
                    <span className="text-xs font-medium text-white/70">{r.value}</span>
                  </div>
                ))}
              </div>
              <button className="text-xs text-captain-400 hover:text-captain-300 font-medium transition-colors text-left mt-auto">
                View Cost Breakdown →
              </button>
            </div>
          </div>

          {/* ── Icon stats: 2-col mobile → 5-col desktop ─────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <IconStat
              icon={<svg className="w-5 h-5 text-captain-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
              value={d.totalOpenWorkOrders} label="Open Work Orders"
              sub={`Across ${d.vessels.filter((v: any) => v.openWorkOrderCount > 0).length} vessels`}
              linkLabel="View Work Orders" onLink={() => router.push("/work-orders")}
            />
            <IconStat
              icon={<svg className="w-5 h-5 text-captain-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>}
              value={d.totalPartsFlagged} label="Parts Flagged"
              sub="Requiring attention" linkLabel="View Parts List" onLink={() => router.push("/vessels")}
            />
            <IconStat
              icon={<svg className="w-5 h-5 text-captain-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              value={d.avgEngineHours != null ? d.avgEngineHours.toLocaleString() : "—"} label="Engine Hours"
              sub="Avg hours per vessel" linkLabel="View Engine Hours" onLink={() => router.push("/vessels")}
            />
            <IconStat
              icon={<svg className="w-5 h-5 text-captain-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
              value={`${d.coveredVessels}/${d.totalVessels}`} label="Mechanic Coverage"
              sub="Vessels assigned" linkLabel="View Assignments" onLink={() => setShowSettings(true)}
            />
            <IconStat
              icon={<svg className="w-5 h-5 text-captain-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
              value={d.warrantyExpiringSoon} label="Warranties Expiring"
              sub="within 90 days" linkLabel="View Warranties" onLink={() => router.push("/vessels")}
            />
          </div>

          {/* ── Vessel roster + Quick actions ────────────────────────────── */}
          {/* Stack on mobile, side-by-side on large screens */}
          <div className="flex flex-col lg:flex-row gap-4 items-start">
            <div className="flex-1 min-w-0 w-full">
              <FleetVesselTable
                vessels={d.vessels}
                fleetId={selectedFleetId!}
                activeFilter={activeFilter}
                onClearFilter={() => setActiveFilter(null)}
              />
            </div>
            <QuickActions onAddVessel={() => setShowAddVessel(true)} onSettings={() => setShowSettings(true)} />
          </div>
        </>
      )}

      {/* Modals */}
      {showCreateFleet && (
        <FleetCreateModal onSuccess={(id) => { setSelectedFleetId(id); setShowCreateFleet(false); }} onClose={() => setShowCreateFleet(false)} />
      )}
      {showSettings && selectedFleetId && (
        <FleetSettingsPanel fleetId={selectedFleetId} onClose={() => setShowSettings(false)} />
      )}
      {showAddVessel && selectedFleetId && (
        <FleetAddVesselModal fleetId={selectedFleetId} onClose={() => setShowAddVessel(false)} />
      )}
    </div>
  );
}
