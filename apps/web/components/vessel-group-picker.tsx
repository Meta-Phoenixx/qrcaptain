"use client";

import { Id } from "../../../convex/_generated/dataModel";
import { useAllAccessibleVessels, type AccessibleVessel } from "@/hooks/useAllAccessibleVessels";

interface VesselGroupPickerProps {
  onSelect: (vessel: { id: Id<"vessels">; name: string }) => void;
  emptyMessage?: string;
}

export function VesselGroupPicker({ onSelect, emptyMessage = "No vessels accessible" }: VesselGroupPickerProps) {
  const { groups, isLoading } = useAllAccessibleVessels();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-captain-400 animate-spin" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-white/20">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 4v2M8 9h8M12 11v10M6 21c0-3.31 2.69-6 6-6s6 2.69 6 6" />
        </svg>
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.type === "fleet" ? group.fleetId : group.type}>
          {/* Group header */}
          <div className="flex items-center gap-3 mb-4">
            {group.type === "owned" ? (
              <>
                <div className="w-6 h-6 rounded-lg bg-captain-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-captain-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 4v2M8 9h8M12 11v10M6 21c0-3.31 2.69-6 6-6s6 2.69 6 6" />
                  </svg>
                </div>
                <h2 className="text-sm font-bold text-white/80">My Vessels</h2>
              </>
            ) : group.type === "fleet" ? (
              <>
                <div className="w-6 h-6 rounded-lg bg-captain-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-captain-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h2 className="text-sm font-bold text-white/80">{group.fleetName}</h2>
              </>
            ) : (
              <>
                <div className="w-6 h-6 rounded-lg bg-white/[0.08] flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-sm font-bold text-white/80">Individual Accounts</h2>
              </>
            )}
            <span className="text-xs text-white/25">{group.vessels.length} vessel{group.vessels.length !== 1 ? "s" : ""}</span>
            <div className="flex-1 h-px bg-white/[0.05]" />
          </div>

          {/* Vessel rows */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {group.vessels.map((v: AccessibleVessel) => (
              <button
                key={v.vesselId}
                onClick={() => onSelect({ id: v.vesselId, name: v.name })}
                className="flex items-center gap-4 px-5 py-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-captain-500/30 transition-all text-left group"
              >
                {v.vesselImageUrl ? (
                  <img src={v.vesselImageUrl} alt={v.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-captain-500/10 border border-captain-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-captain-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 4v2M8 9h8M12 11v10M6 21c0-3.31 2.69-6 6-6s6 2.69 6 6" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate group-hover:text-captain-300 transition-colors">{v.name}</p>
                  <p className="text-xs text-white/30 truncate">
                    {[v.make, v.model].filter(Boolean).join(" ") || "—"}
                    {v.ownerName && <span className="text-white/20"> · {v.ownerName}</span>}
                  </p>
                  {(v.isOverdue || v.isApproaching) && (
                    <p className={`text-[10px] mt-0.5 ${v.isOverdue ? "text-red-400" : "text-amber-400"}`}>
                      {v.isOverdue ? "⚠ Service overdue" : "⏱ Service due soon"}
                    </p>
                  )}
                </div>
                <svg className="w-4 h-4 text-white/20 group-hover:text-captain-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
