"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { FleetSideNav } from "@/components/fleet-side-nav";

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  const h = Math.floor(diff / 3600000);
  if (h > 0) return `${h}h ago`;
  const m = Math.floor(diff / 60000);
  return m > 0 ? `${m}m ago` : "Just now";
}

export default function ReportsPage() {
  const [selectedFleetId, setSelectedFleetId] = useState<Id<"fleets"> | null>(null);
  const [includeResolved, setIncludeResolved] = useState(false);

  const a = api as any;
  const fleetList = useQuery(a.fleetDashboard.listAllFleetsDashboard) ?? [];

  if (fleetList.length > 0 && !selectedFleetId) setSelectedFleetId(fleetList[0]._id);

  const reports = useQuery(
    selectedFleetId ? a.captains.getFleetTripReports : "skip",
    selectedFleetId ? { fleetId: selectedFleetId, includeResolved } : "skip"
  ) ?? [];

  const resolveReport = useMutation(api.captains.resolveTripReport);

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
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Reports</h1>
              <p className="text-sm text-white/40 mt-0.5">Captain trip reports and distress notices</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-white/40">Show resolved</span>
              <button
                onClick={() => setIncludeResolved((v) => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors ${includeResolved ? "bg-captain-500" : "bg-white/10"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${includeResolved ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
            </label>
          </div>
        </div>

        <div className="px-6 py-6">
          {(reports as any[]).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-white/20">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">{includeResolved ? "No reports" : "No open reports"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(reports as any[]).map((r: any) => {
                const isDistress = r.reportType === "distress";
                return (
                  <div
                    key={r._id}
                    className={`px-5 py-4 rounded-xl border ${
                      isDistress
                        ? "bg-red-500/[0.06] border-red-500/20"
                        : "bg-white/[0.03] border-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isDistress && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 uppercase tracking-widest">
                              🚨 Distress
                            </span>
                          )}
                          <span className="text-xs font-semibold text-captain-300">{r.vesselName}</span>
                          <span className="text-[10px] text-white/25">{timeAgo(r.createdAt)}</span>
                          {r.isResolved && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400">
                              ✓ Resolved
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white/80 mt-1.5 leading-relaxed">{r.message}</p>
                        {(r.gpsLat && r.gpsLng) && (
                          <p className="text-xs text-white/25 mt-1">
                            GPS: {r.gpsLat.toFixed(4)}, {r.gpsLng.toFixed(4)}
                          </p>
                        )}
                      </div>
                      {!r.isResolved && (
                        <button
                          onClick={() => resolveReport({ reportId: r._id })}
                          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
