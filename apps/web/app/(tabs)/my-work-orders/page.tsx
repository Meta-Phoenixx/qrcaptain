"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { OwnerSideNav } from "@/components/owner-side-nav";
import { WorkOrderRequestForm } from "@/components/work-order-request-form";
import { QuoteViewer } from "@/components/quote-viewer";

const a = api as any;

const STATUS_TABS = [
  { key: "all",              label: "All"             },
  { key: "quote_requested",  label: "Quote Requested" },
  { key: "quoted",           label: "Quoted"          },
  { key: "in_progress",      label: "In Progress"     },
  { key: "completed",        label: "Completed"       },
];

const STATUS_STYLES: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  quote_requested: { label: "Quote Requested", dot: "bg-amber-400",   text: "text-amber-300",   bg: "bg-amber-500/10"   },
  quoted:          { label: "Quoted",          dot: "bg-captain-400", text: "text-captain-300", bg: "bg-captain-500/10" },
  in_progress:     { label: "In Progress",     dot: "bg-blue-400",    text: "text-blue-300",    bg: "bg-blue-500/10"    },
  completed:       { label: "Completed",       dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-500/10" },
  cancelled:       { label: "Cancelled",       dot: "bg-white/20",    text: "text-white/40",    bg: "bg-white/5"        },
};

export default function MyWorkOrdersPage() {
  const allRequests = useQuery(a.workOrders.getMyWorkOrderRequests, {}) ?? [];
  const [activeTab, setActiveTab] = useState("all");
  const [showRequest, setShowRequest] = useState(false);
  const [viewingQuoteId, setViewingQuoteId] = useState<Id<"workOrders"> | null>(null);

  const filtered = activeTab === "all"
    ? allRequests
    : allRequests.filter((r: any) => r.status === activeTab);

  return (
    <>
      <div className="flex min-h-screen bg-[#0f1929]">
        <OwnerSideNav />

        <main className="flex-1 min-w-0 overflow-x-hidden">
          {/* Header */}
          <div className="px-6 pt-8 pb-6 border-b border-white/[0.06]">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Work Orders</h1>
                <p className="text-sm text-white/40 mt-0.5">{allRequests.length} total request{allRequests.length !== 1 ? "s" : ""}</p>
              </div>
              <button
                onClick={() => setShowRequest(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-captain-500 hover:bg-captain-400 text-white text-sm font-semibold transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Request Service
              </button>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                    ${activeTab === tab.key
                      ? "bg-captain-500/20 text-captain-300 border border-captain-500/30"
                      : "text-white/40 hover:text-white/70 border border-transparent"
                    }`}
                >
                  {tab.label}
                  {tab.key !== "all" && (
                    <span className="ml-1.5 text-xs opacity-60">
                      {allRequests.filter((r: any) => r.status === tab.key).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 py-6">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-white/20">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm">No work orders found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((req: any) => {
                  const s = STATUS_STYLES[req.status] ?? STATUS_STYLES.cancelled;
                  const isQuoted = req.status === "quoted";
                  return (
                    <div
                      key={req._id}
                      className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all"
                    >
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{req.vesselName || "Vessel"}</p>
                          <p className="text-xs text-white/40 mt-0.5 truncate">{req.description}</p>
                          {req.mechanicName && (
                            <p className="text-xs text-white/25 mt-0.5">{req.mechanicCompany || req.mechanicName}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {req.quotedTotalEstimate != null && (
                          <span className="text-sm font-bold text-emerald-400">${req.quotedTotalEstimate.toFixed(2)}</span>
                        )}
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.text} ${s.bg}`}>
                          {s.label}
                        </span>
                        {isQuoted && (
                          <button
                            onClick={() => setViewingQuoteId(req._id)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-captain-500/20 text-captain-300 hover:bg-captain-500/30 transition-colors font-medium"
                          >
                            Review Quote
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {showRequest && (
        <WorkOrderRequestForm onCancel={() => setShowRequest(false)} onSuccess={() => setShowRequest(false)} />
      )}
      {viewingQuoteId && (
        <QuoteViewer workOrderId={viewingQuoteId} onClose={() => setViewingQuoteId(null)} />
      )}
    </>
  );
}
