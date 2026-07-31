"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export type FleetGroup = {
  type: "fleet";
  fleetId: Id<"fleets">;
  fleetName: string;
  vessels: AccessibleVessel[];
};

export type IndividualGroup = {
  type: "individual";
  vessels: AccessibleVessel[];
};

export type VesselGroup = FleetGroup | IndividualGroup;

export type AccessibleVessel = {
  vesselId: Id<"vessels">;
  name: string;
  make?: string;
  model?: string;
  year?: number;
  status: string;
  vesselImageUrl?: string | null;
  isOverdue?: boolean;
  isApproaching?: boolean;
  openWorkOrderCount?: number;
  hasMechanic?: boolean;
  ownerName?: string | null;
};

/**
 * Returns all vessels the current user can access, grouped into:
 * - One group per fleet (fleet managers see their fleets; mechanics see assigned fleets)
 * - One "Individual Accounts" group for vessel-level authorizations not in any fleet
 */
export function useAllAccessibleVessels(): {
  groups: VesselGroup[];
  totalCount: number;
  isLoading: boolean;
} {
  const a = api as any;

  // Fleet vessels — works for fleet_manager and mechanic
  const fleetList = useQuery(a.fleetDashboard.listAllFleetsDashboard) ?? [];

  // All fleet dashboards (one query per fleet — Convex batches these)
  // We call a combined query that returns vessel lists per fleet.
  // For simplicity, use the fleet list and load each individually.
  // Convex caches aggressively so N small queries << 1 large one in latency.
  const fleet0 = useQuery(
    fleetList[0] ? a.fleetDashboard.getFleetDashboard : "skip",
    fleetList[0] ? { fleetId: fleetList[0]._id } : "skip"
  );
  const fleet1 = useQuery(
    fleetList[1] ? a.fleetDashboard.getFleetDashboard : "skip",
    fleetList[1] ? { fleetId: fleetList[1]._id } : "skip"
  );
  const fleet2 = useQuery(
    fleetList[2] ? a.fleetDashboard.getFleetDashboard : "skip",
    fleetList[2] ? { fleetId: fleetList[2]._id } : "skip"
  );
  const fleet3 = useQuery(
    fleetList[3] ? a.fleetDashboard.getFleetDashboard : "skip",
    fleetList[3] ? { fleetId: fleetList[3]._id } : "skip"
  );
  const fleet4 = useQuery(
    fleetList[4] ? a.fleetDashboard.getFleetDashboard : "skip",
    fleetList[4] ? { fleetId: fleetList[4]._id } : "skip"
  );

  const fleetDatas = [fleet0, fleet1, fleet2, fleet3, fleet4];

  // Individual vessel-level authorizations (mechanic only; returns [] for other roles)
  const individualVessels = useQuery(api.vessels.getAuthorizedVessels) ?? [];

  const isLoading =
    fleetList === undefined ||
    (fleetList.length > 0 && fleetDatas.slice(0, fleetList.length).some((d) => d === undefined));

  // Build fleet groups
  const fleetGroups: FleetGroup[] = fleetList.map((fleet: any, i: number) => {
    const data = fleetDatas[i];
    const vessels: AccessibleVessel[] = (data?.vessels ?? []).map((v: any) => ({
      vesselId: v.vesselId,
      name: v.name,
      make: v.make,
      model: v.model,
      year: v.year,
      status: v.status ?? "in_service",
      vesselImageUrl: v.vesselImageUrl,
      isOverdue: v.isOverdue,
      isApproaching: v.isApproaching,
      openWorkOrderCount: v.openWorkOrderCount,
      hasMechanic: v.hasMechanic,
    }));
    return { type: "fleet", fleetId: fleet._id, fleetName: fleet.name, vessels };
  });

  // Collect all fleet vessel IDs to deduplicate
  const fleetVesselIds = new Set(
    fleetGroups.flatMap((g) => g.vessels.map((v) => v.vesselId as string))
  );

  // Individual vessels = vessel-level auths NOT already covered by a fleet group
  const individualOnly: AccessibleVessel[] = (individualVessels as any[])
    .filter((v: any) => !fleetVesselIds.has(v._id as string))
    .map((v: any) => ({
      vesselId: v._id,
      name: v.name,
      make: v.make,
      model: v.model,
      year: v.year,
      status: "in_service",
      vesselImageUrl: v.imageUrl,
      ownerName: v.owner?.name ?? null,
    }));

  const groups: VesselGroup[] = [
    ...fleetGroups.filter((g) => g.vessels.length > 0),
    ...(individualOnly.length > 0 ? [{ type: "individual" as const, vessels: individualOnly }] : []),
  ];

  const totalCount = groups.reduce((sum, g) => sum + g.vessels.length, 0);

  return { groups, totalCount, isLoading };
}
