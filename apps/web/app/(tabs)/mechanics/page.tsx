"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { OwnerSideNav } from "@/components/owner-side-nav";
import { FleetSideNav } from "@/components/fleet-side-nav";
import { MechanicSideNav } from "@/components/mechanic-side-nav";
import { MechanicDirectory } from "@/components/mechanic-directory";

const a = api as any;

export default function MechanicsPage() {
  const user = useQuery(a.users.currentUser);
  const fleets = useQuery(a.fleets.listMyFleets) ?? [];

  const role = user?.role;

  const SideNav =
    role === "mechanic" ? (
      <MechanicSideNav />
    ) : role === "fleet_manager" ? (
      <FleetSideNav
        selectedFleetId={fleets[0]?._id ?? null}
        fleets={fleets}
        onFleetChange={() => {}}
      />
    ) : (
      <OwnerSideNav />
    );

  if (user === undefined) {
    return (
      <div className="flex min-h-screen bg-[#0f1929]">
        <OwnerSideNav />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-captain-400 animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0f1929]">
      {SideNav}

      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="px-6 pt-8 pb-6 border-b border-white/[0.06]">
          <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Mechanics</h1>
          <p className="text-sm text-white/40 mt-0.5">Find and manage certified marine mechanics</p>
        </div>
        <div className="px-6 py-6">
          <MechanicDirectory />
        </div>
      </main>
    </div>
  );
}
