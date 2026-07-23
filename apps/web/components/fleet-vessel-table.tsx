"use client";

import { useRouter } from "next/navigation";
import { Id } from "../../../convex/_generated/dataModel";
import { GlassCard, GlassBadge } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";

type VesselRow = {
  vesselId: Id<"vessels">;
  name: string;
  make?: string;
  model?: string;
  status: string;
  hasInsurance: boolean;
  insuranceExpiry: number | null;
  isOverdue: boolean;
  isApproaching: boolean;
  openWorkOrderCount: number;
  hasMechanic: boolean;
  currentEngineHours?: number | null;
  engineManufacturer?: string | null;
};

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; variant: "green" | "yellow" | "red" | "blue" }> = {
    in_service: { label: "In Service", variant: "green" },
    in_maintenance: { label: "In Maintenance", variant: "yellow" },
    out_of_service: { label: "Out of Service", variant: "red" },
    storage: { label: "Storage", variant: "blue" as const },
  };
  const entry = map[status ?? ""] ?? { label: "Unknown", variant: "blue" as const };
  return <GlassBadge color={entry.variant}>{entry.label}</GlassBadge>;
}

function ServiceBadge({ isOverdue, isApproaching }: { isOverdue?: boolean; isApproaching?: boolean }) {
  if (isOverdue) return <GlassBadge color="red">Overdue</GlassBadge>;
  if (isApproaching) return <GlassBadge color="yellow">Due Soon</GlassBadge>;
  return <GlassBadge color="green">Current</GlassBadge>;
}

function InsuranceBadge({ hasInsurance, expiryDate }: { hasInsurance: boolean; expiryDate: number | null }) {
  if (!hasInsurance) return <GlassBadge color="red">Missing</GlassBadge>;
  if (!expiryDate) return <GlassBadge color="green">On File</GlassBadge>;
  const daysLeft = Math.floor((expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return <GlassBadge color="red">Expired</GlassBadge>;
  if (daysLeft <= 30) return <GlassBadge color="yellow">{daysLeft}d left</GlassBadge>;
  return <GlassBadge color="green">Valid</GlassBadge>;
}

export function FleetVesselTable({
  vessels,
  fleetId,
  activeFilter,
  onClearFilter,
}: {
  vessels: VesselRow[];
  fleetId: Id<"fleets">;
  activeFilter: string | null;
  onClearFilter: () => void;
}) {
  const { mode } = useTheme();
  const router = useRouter();

  const filtered = activeFilter
    ? vessels.filter((v) => {
        if (activeFilter === "in_service") return v.status === "in_service";
        if (activeFilter === "in_maintenance") return v.status === "in_maintenance";
        if (activeFilter === "out_of_service") return v.status === "out_of_service";
        if (activeFilter === "overdue") return v.isOverdue === true;
        if (activeFilter === "approaching") return v.isApproaching === true;
        return true;
      })
    : vessels;

  const borderColor = mode === "dark" ? "border-white/10" : "border-gray-200";
  const theadColor = mode === "dark" ? "text-gray-400 bg-white/[0.03]" : "text-gray-500 bg-gray-50/80";
  const rowHover = mode === "dark" ? "hover:bg-white/[0.03]" : "hover:bg-gray-50/50";
  const cellColor = mode === "dark" ? "text-gray-300" : "text-gray-700";
  const subColor = mode === "dark" ? "text-gray-500" : "text-gray-400";

  return (
    <GlassCard className="overflow-hidden p-0">
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)" }}>
        <h2 className={`text-sm font-semibold ${mode === "dark" ? "text-white" : "text-gray-900"}`}>
          Vessel Roster
          {activeFilter && (
            <span className={`ml-2 text-xs font-normal ${mode === "dark" ? "text-captain-400" : "text-captain-600"}`}>
              — filtered
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {activeFilter && (
            <button
              onClick={onClearFilter}
              className={`text-xs px-3 py-1 rounded-full border ${mode === "dark" ? "border-white/20 text-gray-400 hover:text-white" : "border-gray-300 text-gray-500 hover:text-gray-800"}`}
            >
              Clear filter
            </button>
          )}
          <span className={`text-xs ${subColor}`}>{filtered.length} vessel{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`${theadColor} border-b ${borderColor}`}>
              <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Vessel</th>
              <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider">Service</th>
              <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider">Insurance</th>
              <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider">Engine Hours</th>
              <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider">Work Orders</th>
              <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider">Mechanic</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className={`px-5 py-10 text-center text-sm ${subColor}`}>
                  No vessels match this filter.
                </td>
              </tr>
            ) : (
              filtered.map((vessel) => (
                <tr
                  key={vessel.vesselId}
                  onClick={() => router.push(`/vessel/${vessel.vesselId}`)}
                  className={`border-b last:border-0 ${borderColor} ${rowHover} transition-colors cursor-pointer`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className={`font-medium ${mode === "dark" ? "text-white" : "text-gray-900"}`}>{vessel.name}</p>
                        {(vessel.make || vessel.model) && (
                          <p className={`text-xs mt-0.5 ${subColor}`}>{[vessel.make, vessel.model].filter(Boolean).join(" ")}</p>
                        )}
                      </div>
                      <span className={`ml-auto text-xs ${mode === "dark" ? "text-white/20" : "text-gray-300"}`}>›</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={vessel.status} />
                  </td>
                  <td className="px-4 py-4">
                    <ServiceBadge isOverdue={vessel.isOverdue} isApproaching={vessel.isApproaching} />
                  </td>
                  <td className="px-4 py-4">
                    <InsuranceBadge hasInsurance={vessel.hasInsurance} expiryDate={vessel.insuranceExpiry} />
                  </td>
                  <td className="px-4 py-4">
                    {vessel.currentEngineHours != null ? (
                      <div>
                        <span className={`tabular-nums font-medium ${cellColor}`}>
                          {vessel.currentEngineHours.toLocaleString()} hrs
                        </span>
                        {vessel.engineManufacturer && (
                          <p className={`text-xs mt-0.5 ${subColor}`}>{vessel.engineManufacturer}</p>
                        )}
                      </div>
                    ) : (
                      <span className={`text-xs ${subColor}`}>—</span>
                    )}
                  </td>
                  <td className={`px-4 py-4 tabular-nums ${cellColor}`}>
                    {vessel.openWorkOrderCount}
                  </td>
                  <td className="px-4 py-4">
                    {vessel.hasMechanic
                      ? <GlassBadge color="green">Assigned</GlassBadge>
                      : <GlassBadge color="yellow">Uncovered</GlassBadge>
                    }
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
