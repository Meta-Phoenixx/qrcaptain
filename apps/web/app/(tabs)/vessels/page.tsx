"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { FleetSideNav } from "@/components/fleet-side-nav";

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  in_service:     { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400", label: "In Service"     },
  in_maintenance: { bg: "bg-amber-500/10",   text: "text-amber-400",   dot: "bg-amber-400",   label: "In Maintenance" },
  out_of_service: { bg: "bg-red-500/10",     text: "text-red-400",     dot: "bg-red-400",     label: "Out of Service" },
  storage:        { bg: "bg-sky-500/10",     text: "text-sky-400",     dot: "bg-sky-400",     label: "Storage"        },
};

function StatusPill({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.storage;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

export default function VesselsPage() {
  const router = useRouter();
  const [selectedFleetId, setSelectedFleetId] = useState<Id<"fleets"> | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const a = api as any;
  const fleetList = useQuery(a.fleetDashboard.listAllFleetsDashboard) ?? [];
  const fleetData = useQuery(
    selectedFleetId ? a.fleetDashboard.getFleetDashboard : "skip",
    selectedFleetId ? { fleetId: selectedFleetId } : "skip"
  );

  if (fleetList.length > 0 && !selectedFleetId) setSelectedFleetId(fleetList[0]._id);

  const vessels: any[] = (fleetData?.vessels ?? []).filter((v: any) => {
    const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.make?.toLowerCase().includes(search.toLowerCase()) ||
      v.model?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const allVessels: any[] = fleetData?.vessels ?? [];
  const statusCounts: Record<string, number> = {};
  allVessels.forEach((v: any) => {
    statusCounts[v.status] = (statusCounts[v.status] ?? 0) + 1;
  });

  return (
    <div className="flex min-h-screen bg-[#0f1929]">
      <FleetSideNav
        selectedFleetId={selectedFleetId}
        fleets={fleetList}
        onFleetChange={setSelectedFleetId}
      />

      <main className="flex-1 min-w-0 overflow-x-hidden">
        {/* Header */}
        <div className="px-6 pt-8 pb-6 border-b border-white/[0.06]">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Vessels</h1>
              <p className="text-sm text-white/40 mt-0.5">{allVessels.length} vessel{allVessels.length !== 1 ? "s" : ""} in fleet</p>
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vessels…"
                className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:border-captain-500/40 focus:bg-white/[0.06] transition-colors"
              />
            </div>
          </div>

          {/* Status filter */}
          <div className="flex gap-1.5 mt-5 overflow-x-auto pb-1">
            <button
              onClick={() => setStatusFilter("all")}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === "all" ? "bg-captain-500/15 text-captain-300 border border-captain-500/20" : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"}`}
            >
              All <span className="ml-1 opacity-60">{allVessels.length}</span>
            </button>
            {Object.entries(STATUS_CONFIG).map(([key, c]) => {
              const count = statusCounts[key] ?? 0;
              if (count === 0) return null;
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === key ? `${c.bg} ${c.text} border border-white/10` : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                  {c.label} <span className="opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Vessel grid */}
        <div className="px-6 py-6">
          {vessels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-white/20">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
              </svg>
              <p className="text-sm">{search ? "No vessels match your search" : "No vessels in this fleet"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {vessels.map((v: any) => (
                <button
                  key={v.vesselId}
                  onClick={() => router.push(`/vessel/${v.vesselId}`)}
                  className="flex flex-col rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-captain-500/25 transition-all text-left overflow-hidden group"
                >
                  {/* Image */}
                  <div className="relative h-36 w-full bg-white/[0.03] overflow-hidden">
                    {v.vesselImageUrl ? (
                      <img src={v.vesselImageUrl} alt={v.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-white/[0.06]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 3l14 9-14 9V3z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f1929]/80 to-transparent" />
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate group-hover:text-captain-300 transition-colors">{v.name}</p>
                        <p className="text-xs text-white/35 mt-0.5 truncate">{[v.make, v.model, v.year].filter(Boolean).join(" · ")}</p>
                      </div>
                      <StatusPill status={v.status} />
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.05]">
                      {v.openWorkOrderCount > 0 && (
                        <span className="text-xs text-amber-400">
                          {v.openWorkOrderCount} open WO{v.openWorkOrderCount > 1 ? "s" : ""}
                        </span>
                      )}
                      {v.isOverdue && <span className="text-xs text-red-400">⚠ Service overdue</span>}
                      {v.isApproaching && !v.isOverdue && <span className="text-xs text-amber-400">⏱ Service due soon</span>}
                      {!v.isOverdue && !v.isApproaching && v.openWorkOrderCount === 0 && (
                        <span className="text-xs text-emerald-400">✓ All current</span>
                      )}
                      <span className="ml-auto text-white/20">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
