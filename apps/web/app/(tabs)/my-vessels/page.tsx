"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { OwnerSideNav } from "@/components/owner-side-nav";
import { VesselDetailModal } from "@/components/dashboard";
import { WorkOrderRequestForm } from "@/components/work-order-request-form";
import { AccessRequestModal } from "@/components/access-request-modal";
import { GlassButton } from "@/components/ui/glass";

const a = api as any;

function AddVesselModal({ onClose }: { onClose: () => void }) {
  const createVessel = useMutation(a.vessels.createVessel);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await createVessel({
        name: fd.get("name") as string,
        make: fd.get("make") as string,
        model: fd.get("model") as string,
        year: parseInt(fd.get("year") as string),
        vesselType: fd.get("vesselType") as string,
        registrationNumber: (fd.get("registrationNumber") as string) || undefined,
        hullId: (fd.get("hullId") as string) || undefined,
        notes: (fd.get("notes") as string) || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create vessel");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0d1526] border border-white/[0.1] rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.08]">
          <h2 className="text-xl font-semibold text-white font-heading">Add New Vessel</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Vessel Name *" name="name" required placeholder="e.g., Sea Breeze" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Make *" name="make" required placeholder="e.g., Boston Whaler" />
            <Field label="Model *" name="model" required placeholder="e.g., Outrage 330" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Year *" name="year" type="number" required placeholder="2023" />
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Vessel Type *</label>
              <select name="vesselType" required className="w-full rounded-lg px-3 py-2 bg-black/20 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:border-captain-500/50 focus:ring-captain-500/30">
                <option value="powerboat">Powerboat</option>
                <option value="sailboat">Sailboat</option>
                <option value="yacht">Yacht</option>
                <option value="fishing">Fishing Boat</option>
                <option value="pontoon">Pontoon</option>
                <option value="jet_ski">Jet Ski / PWC</option>
                <option value="center_console">Center Console</option>
                <option value="cabin_cruiser">Cabin Cruiser</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Registration Number" name="registrationNumber" placeholder="FL 1234 AB" />
            <Field label="Hull ID (HIN)" name="hullId" placeholder="ABC12345D678" />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1">Notes</label>
            <textarea name="notes" rows={3} className="w-full rounded-lg px-3 py-2 bg-black/20 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:border-captain-500/50 focus:ring-captain-500/30 resize-none" placeholder="Any additional information…" />
          </div>
          {error && <div className="rounded-lg p-3 text-sm bg-red-500/10 text-red-300 border border-red-500/20">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={isLoading} className="flex-1 py-2.5 rounded-xl bg-captain-500 hover:bg-captain-400 text-white text-sm font-semibold transition-colors disabled:opacity-50">
              {isLoading ? "Creating…" : "Create Vessel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, required, placeholder, type = "text" }: { label: string; name: string; required?: boolean; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/50 mb-1">{label}</label>
      <input name={name} type={type} required={required} placeholder={placeholder} className="w-full rounded-lg px-3 py-2 bg-black/20 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:border-captain-500/50 focus:ring-captain-500/30" />
    </div>
  );
}

// need useMutation import
import { useMutation } from "convex/react";

export default function MyVesselsPage() {
  const vessels = useQuery(a.vessels.listMyVessels) ?? [];
  const pendingQuotes = useQuery(a.workOrders.getMyWorkOrderRequests, { status: "quoted" }) ?? [];
  const pendingRequests = useQuery(a.workOrders.getMyWorkOrderRequests, { status: "quote_requested" }) ?? [];

  const [selectedVessel, setSelectedVessel] = useState<Id<"vessels"> | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWorkOrderRequest, setShowWorkOrderRequest] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<Id<"accessRequests"> | null>(null);

  return (
    <>
      <div className="flex min-h-screen bg-[#0f1929]">
        <OwnerSideNav />

        <main className="flex-1 min-w-0 overflow-x-hidden">
          {/* Header */}
          <div className="px-6 pt-8 pb-6 border-b border-white/[0.06]">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-white font-heading tracking-tight">My Vessels</h1>
                <p className="text-sm text-white/40 mt-0.5">{vessels.length} vessel{vessels.length !== 1 ? "s" : ""} registered</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowWorkOrderRequest(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-captain-500/30 hover:bg-captain-500/10 text-sm font-medium transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Request Service
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-captain-500 hover:bg-captain-400 text-white text-sm font-semibold transition-colors"
                >
                  + Add Vessel
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* Pending Quotes Banner */}
            {pendingQuotes.length > 0 && (
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <h3 className="text-sm font-semibold text-emerald-300 flex items-center gap-2 mb-3">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Quotes Ready for Review ({pendingQuotes.length})
                </h3>
                <div className="space-y-2">
                  {pendingQuotes.map((q: any) => (
                    <div key={q._id} className="flex items-center justify-between gap-4 bg-white/[0.03] rounded-xl px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{q.vesselName}</p>
                        <p className="text-xs text-white/40 truncate">{q.mechanicCompany || q.mechanicName}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm font-bold text-emerald-400">${(q.quotedTotalEstimate || 0).toFixed(2)}</span>
                        <button className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors font-medium">Review</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Requests Banner */}
            {pendingRequests.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <h3 className="text-sm font-semibold text-amber-300 flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Awaiting Mechanic Response ({pendingRequests.length})
                </h3>
                <div className="space-y-2">
                  {pendingRequests.map((r: any) => (
                    <div key={r._id} className="flex items-center justify-between gap-4 bg-white/[0.03] rounded-xl px-4 py-3">
                      <p className="text-sm font-medium text-white truncate">{r.vesselName}</p>
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-500/15 text-amber-300 font-medium flex-shrink-0">Pending Quote</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vessel Grid */}
            {vessels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-white/20">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M5 3l14 9-14 9V3z" />
                </svg>
                <p className="text-sm">No vessels yet</p>
                <button onClick={() => setShowAddModal(true)} className="text-captain-400 hover:text-captain-300 text-sm font-medium transition-colors">+ Add your first vessel</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {vessels.map((vessel: any) => (
                  <VesselCard key={vessel._id} vessel={vessel} onClick={() => setSelectedVessel(vessel._id)} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedVessel && (
        <VesselDetailModal vesselId={selectedVessel} onClose={() => setSelectedVessel(null)} />
      )}
      {showAddModal && <AddVesselModal onClose={() => setShowAddModal(false)} />}
      {showWorkOrderRequest && (
        <WorkOrderRequestForm onCancel={() => setShowWorkOrderRequest(false)} onSuccess={() => setShowWorkOrderRequest(false)} />
      )}
      {selectedRequestId && (
        <AccessRequestModal requestId={selectedRequestId} onClose={() => setSelectedRequestId(null)} />
      )}
    </>
  );
}

function VesselCard({ vessel, onClick }: { vessel: any; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border text-left transition-all group
        ${vessel.activeWorkOrderCount > 0
          ? "border-amber-500/40 ring-1 ring-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10"
          : "border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] hover:border-captain-500/30"
        }`}
    >
      {/* Photo */}
      {vessel.imageUrl ? (
        <img src={vessel.imageUrl} alt={vessel.name} className="w-full h-36 object-cover" />
      ) : (
        <div className="w-full h-36 bg-white/[0.03] flex items-center justify-center">
          <svg className="w-10 h-10 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3l14 9-14 9V3z" />
          </svg>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-white truncate group-hover:text-captain-300 transition-colors">{vessel.name}</p>
            <p className="text-xs text-white/40 mt-0.5">{vessel.make} {vessel.model}</p>
            <p className="text-xs text-white/25">{vessel.year} · {vessel.vesselType?.replace("_", " ")}</p>
          </div>
          <svg className="w-4 h-4 text-captain-400/50 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
          </svg>
        </div>

        {vessel.registrationNumber && (
          <p className="text-xs text-white/25 mt-2">Reg: {vessel.registrationNumber}</p>
        )}

        {vessel.activeWorkOrderCount > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span className="text-xs font-medium text-amber-400">Work In Progress</span>
          </div>
        )}
      </div>
    </button>
  );
}
