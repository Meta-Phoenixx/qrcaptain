"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { OwnerSideNav } from "@/components/owner-side-nav";
import { VesselDetailModal } from "@/components/dashboard";
import { WorkOrderRequestForm } from "@/components/work-order-request-form";
import { QuoteViewer } from "@/components/quote-viewer";

const a = api as any;

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "green" | "amber" | "red" | "sky" | "white";
  onClick?: () => void;
}) {
  const colors = {
    green: "text-emerald-400",
    amber: "text-amber-400",
    red:   "text-red-400",
    sky:   "text-captain-400",
    white: "text-white",
  };
  const cls = `text-2xl font-bold font-heading ${colors[accent ?? "white"]}`;
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="flex flex-col gap-1 px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all text-left disabled:cursor-default"
    >
      <p className="text-xs font-medium text-white/40 uppercase tracking-wider">{label}</p>
      <p className={cls}>{value}</p>
      {sub && <p className="text-xs text-white/30">{sub}</p>}
    </button>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">{title}</h2>
        {href && (
          <button onClick={() => router.push(href)} className="text-xs text-captain-400 hover:text-captain-300 transition-colors">
            View all →
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OwnerDashboardPage() {
  const router = useRouter();
  const vessels     = useQuery(a.vessels.listMyVessels) ?? [];
  const mechanics   = useQuery(a.accessRequests.getMechanicsForOwner) ?? [];
  const pendingQuotes   = useQuery(a.workOrders.getMyWorkOrderRequests, { status: "quoted" }) ?? [];
  const pendingRequests = useQuery(a.workOrders.getMyWorkOrderRequests, { status: "quote_requested" }) ?? [];
  const inProgress      = useQuery(a.workOrders.getMyWorkOrderRequests, { status: "in_progress" }) ?? [];
  const completed       = useQuery(a.workOrders.getMyWorkOrderRequests, { status: "completed" }) ?? [];
  const notifications   = useQuery(api.notifications.getMyNotifications, { limit: 5 }) ?? [];

  const [selectedVessel, setSelectedVessel] = useState<Id<"vessels"> | null>(null);
  const [viewingQuoteId, setViewingQuoteId] = useState<Id<"workOrders"> | null>(null);
  const [showRequestService, setShowRequestService] = useState(false);

  const isLoading = vessels === undefined;

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-[#0f1929]">
        <OwnerSideNav />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-captain-400 animate-spin" />
        </main>
      </div>
    );
  }

  const primaryVessel = vessels[0];
  const totalWorkOrders = pendingRequests.length + inProgress.length + completed.length + pendingQuotes.length;
  const unreadNotifs = (notifications as any[]).filter((n: any) => !n.isRead).length;

  return (
    <>
      <div className="flex min-h-screen bg-[#0f1929]">
        <OwnerSideNav />

        <main className="flex-1 min-w-0 overflow-x-hidden">

          {/* ── Page header ─────────────────────────────────────────── */}
          <div className="px-6 pt-8 pb-6 border-b border-white/[0.06]">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Dashboard</h1>
                <p className="text-sm text-white/40 mt-0.5">
                  {vessels.length} vessel{vessels.length !== 1 ? "s" : ""} · {mechanics.length} mechanic{mechanics.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => setShowRequestService(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-captain-500 hover:bg-captain-400 text-white text-sm font-semibold transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Request Service
              </button>
            </div>
          </div>

          <div className="px-6 py-6 space-y-8 max-w-5xl">

            {/* ── Action items (requires attention) ────────────────── */}
            {(pendingQuotes.length > 0 || pendingRequests.length > 0) && (
              <Section title="Needs Your Attention">
                <div className="space-y-2">
                  {pendingQuotes.map((q: any) => (
                    <div key={q._id} className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="relative flex h-2 w-2 flex-shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">Quote ready — {q.vesselName}</p>
                          <p className="text-xs text-white/40 truncate">{q.mechanicCompany || q.mechanicName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm font-bold text-emerald-400">${(q.quotedTotalEstimate || 0).toFixed(2)}</span>
                        <button
                          onClick={() => setViewingQuoteId(q._id)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors font-medium"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  ))}
                  {pendingRequests.map((r: any) => (
                    <div key={r._id} className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                      <div className="flex items-center gap-3 min-w-0">
                        <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">Awaiting quote — {r.vesselName}</p>
                          <p className="text-xs text-white/40 truncate">{r.description}</p>
                        </div>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 font-medium flex-shrink-0">Pending Quote</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ── Stat row ─────────────────────────────────────────── */}
            <Section title="Overview">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  label="Vessels"
                  value={vessels.length}
                  sub="registered"
                  accent="sky"
                  onClick={() => router.push("/my-vessels")}
                />
                <StatCard
                  label="Work Orders"
                  value={totalWorkOrders}
                  sub={`${inProgress.length} in progress`}
                  accent={inProgress.length > 0 ? "amber" : "white"}
                  onClick={() => router.push("/my-work-orders")}
                />
                <StatCard
                  label="Mechanics"
                  value={mechanics.length}
                  sub="with vessel access"
                  accent="white"
                  onClick={() => router.push("/mechanics")}
                />
                <StatCard
                  label="Alerts"
                  value={unreadNotifs}
                  sub="unread"
                  accent={unreadNotifs > 0 ? "red" : "white"}
                  onClick={() => router.push("/alerts")}
                />
              </div>
            </Section>

            {/* ── My Vessels ────────────────────────────────────────── */}
            {vessels.length > 0 && (
              <Section title="My Vessels" href="/my-vessels">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {vessels.map((v: any) => (
                    <button
                      key={v._id}
                      onClick={() => setSelectedVessel(v._id)}
                      className={`relative overflow-hidden rounded-2xl border text-left transition-all group
                        ${v.activeWorkOrderCount > 0
                          ? "border-amber-500/40 ring-1 ring-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10"
                          : "border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] hover:border-captain-500/30"
                        }`}
                    >
                      {v.imageUrl ? (
                        <img src={v.imageUrl} alt={v.name} className="w-full h-28 object-cover" />
                      ) : (
                        <div className="w-full h-28 bg-white/[0.03] flex items-center justify-center">
                          <svg className="w-8 h-8 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3l14 9-14 9V3z" />
                          </svg>
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-sm font-semibold text-white group-hover:text-captain-300 transition-colors">{v.name}</p>
                        <p className="text-xs text-white/35 mt-0.5">{v.make} {v.model} · {v.year}</p>
                        {v.activeWorkOrderCount > 0 && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                            </span>
                            <span className="text-[10px] font-medium text-amber-400">Work In Progress</span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </Section>
            )}

            {/* ── Active work orders ────────────────────────────────── */}
            {inProgress.length > 0 && (
              <Section title="Work In Progress" href="/my-work-orders">
                <div className="space-y-2">
                  {inProgress.map((wo: any) => (
                    <div key={wo._id} className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="relative flex h-2 w-2 flex-shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{wo.vesselName}</p>
                          <p className="text-xs text-white/40 truncate">{wo.description}</p>
                        </div>
                      </div>
                      <span className="text-xs text-white/30 flex-shrink-0">{wo.mechanicCompany || wo.mechanicName || ""}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ── Recent service history ────────────────────────────── */}
            {completed.length > 0 && (
              <Section title="Recent Service History" href="/my-work-orders">
                <div className="divide-y divide-white/[0.05]">
                  {(completed as any[]).slice(0, 5).map((wo: any) => (
                    <div key={wo._id} className="flex items-center justify-between py-3 gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-white/70 truncate">{wo.description}</p>
                          <p className="text-xs text-white/30 truncate">{wo.vesselName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/30 flex-shrink-0">
                        {wo.mechanicName && <span>{wo.mechanicName}</span>}
                        {wo.completedAt && (
                          <>
                            <span>·</span>
                            <span>{new Date(wo.completedAt).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ── My Mechanics ─────────────────────────────────────── */}
            {mechanics.length > 0 && (
              <Section title="My Mechanics" href="/mechanics">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(mechanics as any[]).slice(0, 4).map((m: any) => (
                    <div key={m._id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="w-9 h-9 rounded-full bg-captain-500/20 border border-captain-500/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-captain-300">
                        {m.firstName?.[0]}{m.lastName?.[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{m.firstName} {m.lastName}</p>
                        <p className="text-xs text-white/35 truncate">{m.companyName || m.email}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${m.hasActiveAccess ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-white/30"}`}>
                        {m.hasActiveAccess ? "Active" : "Inactive"}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ── Recent alerts ─────────────────────────────────────── */}
            {notifications.length > 0 && (
              <Section title="Recent Alerts" href="/alerts">
                <div className="space-y-2">
                  {(notifications as any[]).slice(0, 4).map((n: any) => (
                    <div key={n._id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border transition-all ${n.isRead ? "bg-white/[0.02] border-white/[0.05]" : "bg-captain-500/5 border-captain-500/15"}`}>
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${n.isRead ? "bg-white/20" : "bg-captain-400"}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm truncate ${n.isRead ? "text-white/50" : "text-white/80"}`}>{n.message || n.title}</p>
                        {n.createdAt && (
                          <p className="text-xs text-white/25 mt-0.5">{new Date(n.createdAt).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ── Empty state ───────────────────────────────────────── */}
            {vessels.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-captain-500/10 border border-captain-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-captain-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3l14 9-14 9V3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white/50 font-medium">No vessels yet</p>
                  <p className="text-white/25 text-sm mt-1">Add your first vessel to start tracking maintenance</p>
                </div>
                <button
                  onClick={() => router.push("/my-vessels")}
                  className="px-5 py-2.5 rounded-xl bg-captain-500 hover:bg-captain-400 text-white text-sm font-semibold transition-colors"
                >
                  Add Your First Vessel
                </button>
              </div>
            )}

          </div>
        </main>
      </div>

      {selectedVessel && (
        <VesselDetailModal vesselId={selectedVessel} onClose={() => setSelectedVessel(null)} />
      )}
      {viewingQuoteId && (
        <QuoteViewer workOrderId={viewingQuoteId} onClose={() => setViewingQuoteId(null)} />
      )}
      {showRequestService && (
        <WorkOrderRequestForm onCancel={() => setShowRequestService(false)} onSuccess={() => setShowRequestService(false)} />
      )}
    </>
  );
}
