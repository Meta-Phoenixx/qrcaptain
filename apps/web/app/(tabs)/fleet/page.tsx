"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { FleetDashboard } from "@/components/fleet-dashboard";
import { FleetSideNav } from "@/components/fleet-side-nav";

export default function FleetPage() {
  const [selectedFleetId, setSelectedFleetId] = useState<Id<"fleets"> | null>(null);
  const a = api as any;
  const fleetList = useQuery(a.fleetDashboard.listAllFleetsDashboard) ?? [];

  // Auto-select first fleet
  if (fleetList.length > 0 && !selectedFleetId) setSelectedFleetId(fleetList[0]._id);

  return (
    <div className="flex min-h-screen bg-[#0f1929]">
      <FleetSideNav
        selectedFleetId={selectedFleetId}
        fleets={fleetList}
        onFleetChange={setSelectedFleetId}
      />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <FleetDashboard
          selectedFleetId={selectedFleetId}
          setSelectedFleetId={setSelectedFleetId}
          fleetList={fleetList}
        />
      </main>
    </div>
  );
}
