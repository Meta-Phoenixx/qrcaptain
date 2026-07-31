"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { FleetSideNav } from "@/components/fleet-side-nav";
import { VesselGroupPicker } from "@/components/vessel-group-picker";
import { EquipmentManifest } from "@/components/equipment-manifest";
import { useAllAccessibleVessels } from "@/hooks/useAllAccessibleVessels";

export default function PartsPage() {
  const [selectedFleetId, setSelectedFleetId] = useState<Id<"fleets"> | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<{ id: Id<"vessels">; name: string } | null>(null);

  const a = api as any;
  const fleetList = useQuery(a.fleetDashboard.listAllFleetsDashboard) ?? [];
  const { totalCount } = useAllAccessibleVessels();

  if (fleetList.length > 0 && !selectedFleetId) setSelectedFleetId(fleetList[0]._id);

  return (
    <div className="flex min-h-screen bg-[#0f1929]">
      <FleetSideNav selectedFleetId={selectedFleetId} fleets={fleetList}
        onFleetChange={(id) => { setSelectedFleetId(id); setSelectedVessel(null); }} />

      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="px-6 pt-8 pb-6 border-b border-white/[0.06]">
          <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Parts & Inventory</h1>
          <p className="text-sm text-white/40 mt-0.5">
            Equipment manifests and parts history · {totalCount} vessel{totalCount !== 1 ? "s" : ""}
          </p>
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
              <EquipmentManifest vesselId={selectedVessel.id} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
