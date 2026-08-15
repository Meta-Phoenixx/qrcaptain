"use client";

import { useState } from "react";
import { Id } from "../../../../../convex/_generated/dataModel";
import { AppSideNav } from "@/components/app-side-nav";
import { VesselGroupPicker } from "@/components/vessel-group-picker";
import { ManifestViewer } from "@/components/manifest-viewer";
import { useAllAccessibleVessels } from "@/hooks/useAllAccessibleVessels";

export default function DocumentsPage() {
  const [selectedVessel, setSelectedVessel] = useState<{ id: Id<"vessels">; name: string } | null>(null);

  const { totalCount } = useAllAccessibleVessels();

  return (
    <div className="flex min-h-screen bg-[#0f1929]">
      <AppSideNav />

      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="px-6 pt-8 pb-6 border-b border-white/[0.06]">
          <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Documents</h1>
          <p className="text-sm text-white/40 mt-0.5">
            Registration, insurance, and vessel records · {totalCount} vessel{totalCount !== 1 ? "s" : ""}
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
              <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] overflow-hidden">
                <ManifestViewer
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
