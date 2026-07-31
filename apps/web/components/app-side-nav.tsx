"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { FleetSideNav } from "@/components/fleet-side-nav";
import { OwnerSideNav } from "@/components/owner-side-nav";

interface AppSideNavProps {
  selectedFleetId: Id<"fleets"> | null;
  fleets: Array<{ _id: Id<"fleets">; name: string; vesselCount: number }>;
  onFleetChange: (id: Id<"fleets">) => void;
}

export function AppSideNav({ selectedFleetId, fleets, onFleetChange }: AppSideNavProps) {
  const currentUser = useQuery((api as any).users.currentUser);

  if (currentUser?.role === "owner") {
    return <OwnerSideNav />;
  }

  return (
    <FleetSideNav
      selectedFleetId={selectedFleetId}
      fleets={fleets}
      onFleetChange={onFleetChange}
    />
  );
}
