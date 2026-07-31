"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { FleetSideNav } from "@/components/fleet-side-nav";
import { EquipmentManifest } from "@/components/equipment-manifest";

export default function PartsPage() {
  const [selectedFleetId, setSelectedFleetId] = useState<Id<"fleets"> | null>(null);
  const [selectedVesselId, setSelectedVesselId] = useState<Id<"vessels"> | null>(null);
  const [selectedVesselName, setSelectedVesselName] = useState<string>("");

  const a = api as any;
  const fleetList = useQuery(a.fleetDashboard.listAllFleetsDashboard) ?? [];
  const fleetData = useQuery(
    selectedFleetId ? a.fleetDashboard.getFleetDashboard : "skip",
    selectedFleetId ? { fleetId: selectedFleetId } : "skip"
  );

  if (fleetList.length > 0 && !selectedFleetId) setSelectedFleetId(fleetList[0]._id);

  const vessels: any[] = fleetData?.vessels ?? [];

  return (
    <div className="flex min-h-screen bg-[#0f1929]">
      <FleetSideNav
        selectedFleetId={selectedFleetId}
        fleets={fleetList}
        onFleetChange={(id) => { setSelectedFleetId(id); setSelectedVesselId(null); }}
      />

      <main className="flex-1 min-w-0 overflow-x-hidden">
        {/* Header */}
        <div className="px-6 pt-8 pb-6 border-b border-white/[0.06]">
          <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Parts & Inventory</h1>
          <p className="text-sm text-white/40 mt-0.5">Equipment manifests and parts history per vessel</p>
        </div>

        <div className="px-6 py-6">
          {/* Vessel picker */}
          {!selectedVesselId ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-4">Select a vessel</p>
              {vessels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-white/20">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p className="text-sm">No vessels in this fleet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {vessels.map((v: any) => (
                    <button
                      key={v.vesselId}
                      onClick={() => { setSelectedVesselId(v.vesselId); setSelectedVesselName(v.name); }}
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
                        <p className="text-xs text-white/30 truncate">{[v.make, v.model].filter(Boolean).join(" ") || "—"}</p>
                      </div>
                      <svg className="w-4 h-4 text-white/20 group-hover:text-captain-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Back */}
              <button
                onClick={() => setSelectedVesselId(null)}
                className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-6"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                All vessels
              </button>
              <EquipmentManifest vesselId={selectedVesselId} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
