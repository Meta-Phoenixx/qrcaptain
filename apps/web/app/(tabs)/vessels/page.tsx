"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { AppSideNav } from "@/components/app-side-nav";
import { FleetAddVesselModal } from "@/components/fleet-add-vessel-modal";
import { useAllAccessibleVessels, type AccessibleVessel } from "@/hooks/useAllAccessibleVessels";

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  in_service:     { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400", label: "In Service"     },
  in_maintenance: { bg: "bg-amber-500/10",   text: "text-amber-400",   dot: "bg-amber-400",   label: "In Maintenance" },
  out_of_service: { bg: "bg-red-500/10",     text: "text-red-400",     dot: "bg-red-400",     label: "Out of Service" },
  storage:        { bg: "bg-sky-500/10",     text: "text-sky-400",     dot: "bg-sky-400",     label: "Storage"        },
};

function StatusPill({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.in_service;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function VesselCard({ v, onClick }: { v: AccessibleVessel; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-captain-500/25 transition-all text-left overflow-hidden group"
    >
      <div className="relative h-36 w-full bg-white/[0.03] overflow-hidden">
        {v.vesselImageUrl ? (
          <img src={v.vesselImageUrl} alt={v.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-white/[0.06]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 4v2M8 9h8M12 11v10M6 21c0-3.31 2.69-6 6-6s6 2.69 6 6" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1929]/80 to-transparent" />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate group-hover:text-captain-300 transition-colors">{v.name}</p>
            <p className="text-xs text-white/35 mt-0.5 truncate">
              {[v.make, v.model, v.year].filter(Boolean).join(" · ")}
              {v.ownerName && <span className="text-white/25"> · {v.ownerName}</span>}
            </p>
          </div>
          <StatusPill status={v.status} />
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.05]">
          {v.openWorkOrderCount ? (
            <span className="text-xs text-amber-400">{v.openWorkOrderCount} open WO{v.openWorkOrderCount > 1 ? "s" : ""}</span>
          ) : null}
          {v.isOverdue && <span className="text-xs text-red-400">⚠ Service overdue</span>}
          {v.isApproaching && !v.isOverdue && <span className="text-xs text-amber-400">⏱ Due soon</span>}
          {!v.isOverdue && !v.isApproaching && !v.openWorkOrderCount && (
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
  );
}

export default function VesselsPage() {
  const router = useRouter();
  const [selectedFleetId, setSelectedFleetId] = useState<Id<"fleets"> | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addVesselOpen, setAddVesselOpen] = useState(false);

  const a = api as any;
  const fleetList = useQuery(a.fleetDashboard.listAllFleetsDashboard) ?? [];
  const { groups, totalCount } = useAllAccessibleVessels();

  if (fleetList.length > 0 && !selectedFleetId) setSelectedFleetId(fleetList[0]._id);

  const filterVessel = (v: AccessibleVessel) => {
    const matchSearch = !search ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.make?.toLowerCase().includes(search.toLowerCase()) ||
      v.model?.toLowerCase().includes(search.toLowerCase()) ||
      v.ownerName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    return matchSearch && matchStatus;
  };

  const allVessels = groups.flatMap((g) => g.vessels);
  const statusCounts: Record<string, number> = {};
  allVessels.forEach((v) => { statusCounts[v.status] = (statusCounts[v.status] ?? 0) + 1; });

  return (
    <div className="flex min-h-screen bg-[#0f1929]">
      <AppSideNav />

      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="px-6 pt-8 pb-6 border-b border-white/[0.06]">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Vessels</h1>
              <p className="text-sm text-white/40 mt-0.5">{totalCount} vessel{totalCount !== 1 ? "s" : ""} accessible</p>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              {selectedFleetId && (
                <button
                  onClick={() => setAddVesselOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-captain-500/15 border border-captain-500/20 text-captain-300 text-sm font-medium hover:bg-captain-500/25 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Vessel
                </button>
              )}
            </div>
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vessels…"
                className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:border-captain-500/40 transition-colors" />
            </div>
          </div>

          <div className="flex gap-1.5 mt-5 overflow-x-auto pb-1">
            <button onClick={() => setStatusFilter("all")}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === "all" ? "bg-captain-500/15 text-captain-300 border border-captain-500/20" : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"}`}>
              All <span className="ml-1 opacity-60">{totalCount}</span>
            </button>
            {Object.entries(STATUS_CONFIG).map(([key, c]) => {
              const count = statusCounts[key] ?? 0;
              if (!count) return null;
              return (
                <button key={key} onClick={() => setStatusFilter(key)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === key ? `${c.bg} ${c.text} border border-white/10` : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{c.label} <span className="opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-6 space-y-8">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-white/20">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 4v2M8 9h8M12 11v10M6 21c0-3.31 2.69-6 6-6s6 2.69 6 6" />
              </svg>
              <p className="text-sm">No vessels accessible</p>
            </div>
          ) : (
            groups.map((group) => {
              const filtered = group.vessels.filter(filterVessel);
              if (!filtered.length) return null;
              return (
                <section key={group.type === "fleet" ? group.fleetId : "individual"}>
                  {/* Section header */}
                  <div className="flex items-center gap-3 mb-4">
                    {group.type === "fleet" ? (
                      <>
                        <div className="w-6 h-6 rounded-lg bg-captain-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-captain-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <h2 className="text-sm font-bold text-white/80">{group.fleetName}</h2>
                        <span className="text-xs text-white/25">{filtered.length} vessels</span>
                      </>
                    ) : (
                      <>
                        <div className="w-6 h-6 rounded-lg bg-white/[0.08] flex items-center justify-center flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <h2 className="text-sm font-bold text-white/80">Individual Accounts</h2>
                        <span className="text-xs text-white/25">{filtered.length} vessels</span>
                      </>
                    )}
                    <div className="flex-1 h-px bg-white/[0.05]" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((v) => (
                      <VesselCard key={v.vesselId} v={v} onClick={() => router.push(`/vessel/${v.vesselId}`)} />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </main>

      {addVesselOpen && selectedFleetId && (
        <FleetAddVesselModal
          fleetId={selectedFleetId}
          onClose={() => setAddVesselOpen(false)}
        />
      )}
    </div>
  );
}
