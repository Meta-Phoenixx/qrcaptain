"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { AppSideNav } from "@/components/app-side-nav";
import { WorkOrderEditor } from "@/components/work-order-editor";

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  quote_requested: { bg: "bg-amber-500/10",   text: "text-amber-400",   dot: "bg-amber-400",   label: "Quote Requested" },
  quoted:          { bg: "bg-sky-500/10",     text: "text-sky-400",     dot: "bg-sky-400",     label: "Quoted"          },
  in_progress:     { bg: "bg-captain-500/10", text: "text-captain-400", dot: "bg-captain-400", label: "In Progress"     },
  completed:       { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400", label: "Completed"       },
  declined:        { bg: "bg-red-500/10",     text: "text-red-400",     dot: "bg-red-400",     label: "Declined"        },
  cancelled:       { bg: "bg-white/[0.05]",   text: "text-white/40",    dot: "bg-white/20",    label: "Cancelled"       },
};

type StatusFilter = "all" | "quote_requested" | "quoted" | "in_progress" | "completed" | "cancelled";

function StatusPill({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.cancelled;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  const h = Math.floor(diff / 3600000);
  if (h > 0) return `${h}h ago`;
  return "Just now";
}

export default function WorkOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [openWorkOrderId, setOpenWorkOrderId] = useState<Id<"workOrders"> | null>(null);

  const a = api as any;
  const myOrders   = useQuery(api.workOrders.getMyWorkOrders, statusFilter !== "all" ? { status: statusFilter as any } : {}) ?? [];

  const STATUS_TABS: { key: StatusFilter; label: string }[] = [
    { key: "all",             label: "All"             },
    { key: "in_progress",     label: "In Progress"     },
    { key: "quote_requested", label: "Quote Requested" },
    { key: "quoted",          label: "Quoted"          },
    { key: "completed",       label: "Completed"       },
  ];

  return (
    <div className="flex min-h-screen bg-[#0f1929]">
      <AppSideNav />

      <main className="flex-1 min-w-0 overflow-x-hidden">
        {/* Header */}
        <div className="px-6 pt-8 pb-6 border-b border-white/[0.06]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Work Orders</h1>
              <p className="text-sm text-white/40 mt-0.5">{myOrders.length} job{myOrders.length !== 1 ? "s" : ""}</p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 mt-5 overflow-x-auto pb-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === tab.key
                    ? "bg-captain-500/15 text-captain-300 border border-captain-500/20"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Work orders list */}
        <div className="px-6 py-6">
          {myOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-white/20">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p className="text-sm">No work orders found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myOrders.map((wo: any) => (
                <button
                  key={wo._id}
                  onClick={() => setOpenWorkOrderId(wo._id)}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all text-left group"
                >
                  {/* Status dot */}
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_CONFIG[wo.status]?.dot ?? "bg-white/20"}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white truncate">{wo.title || "Work Order"}</p>
                      <StatusPill status={wo.status} />
                    </div>
                    <p className="text-xs text-white/35 mt-0.5 truncate">
                      {wo.vesselName && <span className="text-white/50">{wo.vesselName}</span>}
                      {wo.ownerName && <span> · {wo.ownerName}</span>}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-white/30">{timeAgo(wo.createdAt)}</p>
                    {wo.laborHours && (
                      <p className="text-xs text-white/25 mt-0.5">{wo.laborHours}h labor</p>
                    )}
                  </div>

                  <svg className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Work order detail drawer */}
      {openWorkOrderId && (
        <WorkOrderEditor
          workOrderId={openWorkOrderId}
          onClose={() => setOpenWorkOrderId(null)}
        />
      )}
    </div>
  );
}
