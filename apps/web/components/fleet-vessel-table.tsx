"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Id } from "../../../convex/_generated/dataModel";
import { useTheme } from "./providers/theme-provider";

type VesselRow = {
  vesselId: Id<"vessels">;
  name: string;
  make?: string;
  model?: string;
  status: string;
  hasInsurance: boolean;
  insuranceExpiry: number | null;
  isOverdue: boolean;
  isApproaching: boolean;
  openWorkOrderCount: number;
  hasMechanic: boolean;
  mechanicName?: string | null;
  mechanicCompany?: string | null;
  currentEngineHours?: number | null;
  engineManufacturer?: string | null;
  nextServiceDate?: number | null;
};

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  in_service:     { bg: "bg-emerald-500/15", text: "text-emerald-400", dot: "bg-emerald-400" },
  in_maintenance: { bg: "bg-amber-500/15",   text: "text-amber-400",   dot: "bg-amber-400"   },
  out_of_service: { bg: "bg-red-500/15",     text: "text-red-400",     dot: "bg-red-400"     },
  storage:        { bg: "bg-sky-500/15",     text: "text-sky-400",     dot: "bg-sky-400"     },
};

const STATUS_LABELS: Record<string, string> = {
  in_service: "In Service", in_maintenance: "In Maintenance",
  out_of_service: "Out of Service", storage: "Storage",
};

function StatusPill({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.storage;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function ServicePill({ isOverdue, isApproaching, daysOverdue }: { isOverdue?: boolean; isApproaching?: boolean; daysOverdue?: number }) {
  if (isOverdue) return (
    <div>
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/15 text-red-400">
        ⚠ Overdue
      </span>
      {daysOverdue != null && <p className="text-[10px] text-red-400/70 mt-0.5 pl-1">{daysOverdue} days</p>}
    </div>
  );
  if (isApproaching) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400">
      ⏱ Due Soon
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400">
      ✓ Current
    </span>
  );
}

function NextServiceCell({ date }: { date: number | null | undefined }) {
  if (!date) return <span className="text-xs text-white/25">—</span>;
  const now = Date.now();
  const days = Math.ceil((date - now) / 86400000);
  const d = new Date(date);
  const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const urgent = days <= 14;
  const color = days < 0 ? "text-red-400" : urgent ? "text-amber-400" : "text-emerald-400";
  return (
    <div>
      <p className="text-xs text-white/60">{label}</p>
      <p className={`text-[10px] font-medium ${color}`}>
        {days < 0 ? `${Math.abs(days)}d overdue` : `in ${days} days`}
      </p>
    </div>
  );
}

function MechanicCell({ name, company }: { name?: string | null; company?: string | null }) {
  if (!name) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-amber-500/10 text-amber-400">
      Uncovered
    </span>
  );
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-full bg-captain-500/20 border border-captain-500/30 flex items-center justify-center text-[10px] font-bold text-captain-300 flex-shrink-0">
        {initials}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-white/80 truncate">{name}</p>
        {company && <p className="text-[10px] text-white/40 truncate">{company}</p>}
      </div>
    </div>
  );
}

export function FleetVesselTable({
  vessels,
  fleetId,
  activeFilter,
  onClearFilter,
}: {
  vessels: VesselRow[];
  fleetId: Id<"fleets">;
  activeFilter: string | null;
  onClearFilter: () => void;
}) {
  const { mode } = useTheme();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mechanicFilter, setMechanicFilter] = useState("all");

  const filtered = useMemo(() => {
    let rows = vessels;

    // Active filter from parent (clicking stat tiles)
    if (activeFilter) {
      if (activeFilter === "in_service") rows = rows.filter((v) => v.status === "in_service");
      else if (activeFilter === "in_maintenance") rows = rows.filter((v) => v.status === "in_maintenance");
      else if (activeFilter === "out_of_service") rows = rows.filter((v) => v.status === "out_of_service");
      else if (activeFilter === "overdue") rows = rows.filter((v) => v.isOverdue);
      else if (activeFilter === "approaching") rows = rows.filter((v) => v.isApproaching);
    }

    // Local search
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((v) =>
        v.name.toLowerCase().includes(q) ||
        v.make?.toLowerCase().includes(q) ||
        v.model?.toLowerCase().includes(q)
      );
    }

    // Status dropdown
    if (statusFilter !== "all") rows = rows.filter((v) => v.status === statusFilter);

    // Mechanic dropdown
    if (mechanicFilter === "covered") rows = rows.filter((v) => v.hasMechanic);
    else if (mechanicFilter === "uncovered") rows = rows.filter((v) => !v.hasMechanic);

    return rows;
  }, [vessels, activeFilter, search, statusFilter, mechanicFilter]);

  const isDark = mode === "dark";
  const card = isDark ? "bg-white/[0.03] border-white/[0.07]" : "bg-white border-gray-200";
  const th = isDark ? "text-white/40 bg-white/[0.02]" : "text-gray-400 bg-gray-50";
  const rowHover = isDark ? "hover:bg-white/[0.04]" : "hover:bg-gray-50";
  const divider = isDark ? "border-white/[0.06]" : "border-gray-100";

  return (
    <div className={`rounded-2xl border overflow-hidden ${card}`}>
      {/* Table header bar */}
      <div className={`flex flex-col gap-3 px-4 sm:px-5 py-4 border-b ${divider}`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            Vessel Roster
            {activeFilter && (
              <button onClick={onClearFilter} className="ml-2 text-xs font-normal text-captain-400 hover:text-captain-300">
                — clear filter ×
              </button>
            )}
          </h2>
          <span className="text-xs text-white/30 flex-shrink-0">{filtered.length} vessel{filtered.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-[200px]">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vessels..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-white/[0.06] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-captain-500/50"
            />
          </div>
          <div className="flex gap-2">
            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 px-3 py-2 text-xs rounded-lg bg-white/[0.06] border border-white/10 text-white/70 focus:outline-none focus:border-captain-500/50"
            >
              <option value="all">All Status</option>
              <option value="in_service">In Service</option>
              <option value="in_maintenance">Maintenance</option>
              <option value="out_of_service">Out of Service</option>
              <option value="storage">Storage</option>
            </select>
            {/* Mechanic filter */}
            <select
              value={mechanicFilter}
              onChange={(e) => setMechanicFilter(e.target.value)}
              className="flex-1 px-3 py-2 text-xs rounded-lg bg-white/[0.06] border border-white/10 text-white/70 focus:outline-none focus:border-captain-500/50"
            >
              <option value="all">All Mechanics</option>
              <option value="covered">Assigned</option>
              <option value="uncovered">Uncovered</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`${th} border-b ${divider} text-xs uppercase tracking-wider`}>
              <th className="text-left px-5 py-3 font-medium">Vessel</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Service Status</th>
              <th className="text-left px-4 py-3 font-medium">Engine Hours</th>
              <th className="text-left px-4 py-3 font-medium">Mechanic</th>
              <th className="text-left px-4 py-3 font-medium">Next Service</th>
              <th className="text-left px-4 py-3 font-medium">Work Orders</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-sm text-white/25">
                  No vessels match this filter.
                </td>
              </tr>
            ) : (
              filtered.map((vessel) => (
                <tr
                  key={vessel.vesselId}
                  onClick={() => router.push(`/vessel/${vessel.vesselId}`)}
                  className={`border-b last:border-0 ${divider} ${rowHover} transition-colors cursor-pointer`}
                >
                  {/* Vessel name + model */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {/* Boat icon placeholder */}
                      <div className="w-10 h-10 rounded-lg bg-captain-500/10 border border-captain-500/20 flex items-center justify-center flex-shrink-0 text-lg">
                        ⛵
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{vessel.name}</p>
                        <p className="text-[11px] text-white/40 mt-0.5">
                          {[vessel.make, vessel.model].filter(Boolean).join(" ")}
                        </p>
                      </div>
                    </div>
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <StatusPill status={vessel.status} />
                  </td>
                  {/* Service status */}
                  <td className="px-4 py-3.5">
                    <ServicePill isOverdue={vessel.isOverdue} isApproaching={vessel.isApproaching} />
                  </td>
                  {/* Engine hours */}
                  <td className="px-4 py-3.5">
                    {vessel.currentEngineHours != null ? (
                      <div>
                        <span className="text-sm font-semibold text-white/80 tabular-nums">
                          {vessel.currentEngineHours.toLocaleString()} hrs
                        </span>
                        {vessel.engineManufacturer && (
                          <p className="text-[10px] text-white/35 mt-0.5">{vessel.engineManufacturer}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-white/25">—</span>
                    )}
                  </td>
                  {/* Mechanic */}
                  <td className="px-4 py-3.5">
                    <MechanicCell name={vessel.mechanicName} company={vessel.mechanicCompany} />
                  </td>
                  {/* Next service */}
                  <td className="px-4 py-3.5">
                    <NextServiceCell date={vessel.nextServiceDate} />
                  </td>
                  {/* Work orders */}
                  <td className="px-4 py-3.5">
                    <span className={`text-sm font-medium tabular-nums ${vessel.openWorkOrderCount > 0 ? "text-captain-400" : "text-white/30"}`}>
                      {vessel.openWorkOrderCount}
                    </span>
                  </td>
                  {/* Chevron */}
                  <td className="px-4 py-3.5 text-white/20 text-right">›</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className={`px-5 py-3 border-t ${divider} flex justify-center`}>
        <button
          onClick={() => router.push("/vessels")}
          className="text-xs text-captain-400 hover:text-captain-300 font-medium transition-colors"
        >
          View All {vessels.length} Vessels →
        </button>
      </div>
    </div>
  );
}
