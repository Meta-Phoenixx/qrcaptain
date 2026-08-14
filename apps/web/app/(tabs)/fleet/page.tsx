"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { FleetDashboard } from "@/components/fleet-dashboard";
import { FleetSideNav } from "@/components/fleet-side-nav";

export default function FleetPage() {
  const router = useRouter();
  const [selectedFleetId, setSelectedFleetId] = useState<Id<"fleets"> | null>(null);
  const a = api as any;
  const fleetList = useQuery(a.fleetDashboard.listAllFleetsDashboard) ?? [];
  const me = useQuery(a.users.currentUser);

  useEffect(() => {
    if (me === undefined) return; // loading
    if (me && me.role !== "fleet_manager" && me.role !== "mechanic" && me.role !== "admin") {
      router.replace("/home");
      return;
    }
    // Only fleet_managers need to complete onboarding before accessing this page
    if (me && me.role === "fleet_manager" && (!me.onboardingCompleted || !me.companyName)) {
      router.replace("/onboarding/fleet-manager");
    }
  }, [me, router]);

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
