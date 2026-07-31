"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { FleetSideNav } from "@/components/fleet-side-nav";
import { ServiceHistoryViewer } from "@/components/service-history-viewer";

const URGENCY: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  overdue:    { bg: "bg-red-500/10",    text: "text-red-400",    dot: "bg-red-400",    label: "Overdue"     },
  approaching:{ bg: "bg-amber-500/10",  text: "text-amber-400",  dot: "bg-amber-400",  label: "Due Soon"    },
  ok:         { bg: "bg-emerald-500/10",text: "text-emerald-400",dot: "bg-emerald-400",label: "Current"     },
};

export default function MaintenancePage() {
  const [selectedFleetId, setSelectedFleetId] = useState<Id<"fleets"> | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<{ id: Id<"vessels">; name: string } | null>(null);

  const a = api as any;
  const fleetList  = useQuery(a.fleetDashboard.listAllFleetsDashboard) ?? [];
  const fleetData  = useQuery(
    selectedFleetId ? a.fleetDashboard.getFleetDashboard : "skip",
    selectedFleetId ? { fleetId: selectedFleetId } : "skip"
  );
  const serviceStatus = useQuery(
    selectedFleetId ? a.engineHours.getFleetServiceStatus : "skip",
    selectedFleetId ? { fleetId: selectedFleetId } : "skip"
  ) ?? [];

  if (fleetList.length > 0 && !selectedFleetId) setSelectedFleetId(fleetList[0]._id);

  const vessels: any[] = fleetData?.vessels ?? [];

  // Build urgency map from serviceStatus
  const urgencyMap: Record<string, "overdue" | "approaching" | "ok"> = {};
  (serviceStatus as any[]).forEach((s: any) => {
    urgencyMap[s.vessel._id] = s.isOverdue ? "overdue" : s.isApproaching ? "approaching" : "ok";
  });

  return (
    <div className="flex min-h-screen bg-[#0f1929]">
      <FleetSideNav
        selectedFleetId={selectedFleetId}
        fleets={fleetList}
        onFleetChange={(id) => { setSelectedFleetId(id); setSelectedVessel(null); }}
      />

      <main className="flex-1 min-w-0 overflow-x-hidden">
        {/* Header */}
        <div className="px-6 pt-8 pb-6 border-b border-white/[0.06]">
          <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Maintenance</h1>
          <p className="text-sm text-white/40 mt-0.5">Service history and upcoming maintenance per vessel</p>

          {/* Fleet summary pills */}
          {serviceStatus.length > 0 && !selectedVessel && (
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              {["overdue", "approaching", "ok"].map((u) => {
                const count = (serviceStatus as any[]).filter((s: any) =>
                  u === "overdue" ? s.isOverdue : u === "approaching" ? (!s.isOverdue && s.isApproaching) : (!s.isOverdue && !s.isApproaching)
                ).length;
                if (count === 0) return null;
                const c = URGENCY[u];
                return (
                  <span key={u} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                    {count} {c.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-6">
          {!selectedVessel ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-4">Select a vessel</p>
              {vessels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-white/20">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  </svg>
                  <p className="text-sm">No vessels in this fleet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {vessels.map((v: any) => {
                    const urgency = urgencyMap[v.vesselId] ?? "ok";
                    const c = URGENCY[urgency];
                    return (
                      <button
                        key={v.vesselId}
                        onClick={() => setSelectedVessel({ id: v.vesselId, name: v.name })}
                        className="flex items-center gap-4 px-5 py-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-captain-500/30 transition-all text-left group"
                      >
                        {v.vesselImageUrl ? (
                          <img src={v.vesselImageUrl} alt={v.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-captain-500/10 border border-captain-500/20 flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-captain-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3l14 9-14 9V3z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate group-hover:text-captain-300 transition-colors">{v.name}</p>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-medium mt-0.5 ${c.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                            {c.label}
                          </span>
                        </div>
                        <svg className="w-4 h-4 text-white/20 group-hover:text-captain-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div>
              <button
                onClick={() => setSelectedVessel(null)}
                className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-6"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                All vessels
              </button>
              <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] overflow-hidden">
                <ServiceHistoryViewer
                  vesselId={selectedVessel.id}
                  vesselName={selectedVessel.name}
                  onClose={() => setSelectedVessel(null)}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
