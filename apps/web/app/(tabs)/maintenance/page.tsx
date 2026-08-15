"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { AppSideNav } from "@/components/app-side-nav";
import { VesselGroupPicker } from "@/components/vessel-group-picker";
import { ServiceHistoryViewer } from "@/components/service-history-viewer";
import { useAllAccessibleVessels } from "@/hooks/useAllAccessibleVessels";

const URGENCY: Record<string, { text: string; dot: string; label: string }> = {
  overdue:    { text: "text-red-400",    dot: "bg-red-400",    label: "Overdue"  },
  approaching:{ text: "text-amber-400",  dot: "bg-amber-400",  label: "Due Soon" },
  ok:         { text: "text-emerald-400",dot: "bg-emerald-400",label: "Current"  },
};

export default function MaintenancePage() {
  const [selectedFleetId, setSelectedFleetId] = useState<Id<"fleets"> | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<{ id: Id<"vessels">; name: string } | null>(null);

  const a = api as any;
  const fleetList = useQuery(a.fleetDashboard.listAllFleetsDashboard) ?? [];
  const { groups, totalCount } = useAllAccessibleVessels();

  // Fleet-level service status for summary pills (fleet manager / mechanic with fleet access)
  const serviceStatus = useQuery(
    selectedFleetId ? a.engineHours.getFleetServiceStatus : "skip",
    selectedFleetId ? { fleetId: selectedFleetId } : "skip"
  ) ?? [];

  if (fleetList.length > 0 && !selectedFleetId) setSelectedFleetId(fleetList[0]._id);

  const overdueCount   = (serviceStatus as any[]).filter((s: any) => s.isOverdue).length;
  const approachCount  = (serviceStatus as any[]).filter((s: any) => !s.isOverdue && s.isApproaching).length;

  return (
    <div className="flex min-h-screen bg-[#0f1929]">
      <AppSideNav />

      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="px-6 pt-8 pb-6 border-b border-white/[0.06]">
          <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Maintenance</h1>
          <p className="text-sm text-white/40 mt-0.5">
            Service history and upcoming maintenance · {totalCount} vessel{totalCount !== 1 ? "s" : ""}
          </p>

          {!selectedVessel && (overdueCount > 0 || approachCount > 0) && (
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              {overdueCount > 0 && (
                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 ${URGENCY.overdue.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${URGENCY.overdue.dot}`} />
                  {overdueCount} {URGENCY.overdue.label}
                </span>
              )}
              {approachCount > 0 && (
                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 ${URGENCY.approaching.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${URGENCY.approaching.dot}`} />
                  {approachCount} {URGENCY.approaching.label}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-6">
          {!selectedVessel ? (
            <VesselGroupPicker
              onSelect={setSelectedVessel}
              emptyMessage="No vessels accessible"
            />
          ) : (
            <div>
              <button onClick={() => setSelectedVessel(null)}
                className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-6">
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
