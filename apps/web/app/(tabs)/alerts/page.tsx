"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { FleetSideNav } from "@/components/fleet-side-nav";

const TYPE_LABELS: Record<string, string> = {
  fleet_service_overdue:    "Service Overdue",
  fleet_service_approaching:"Service Approaching",
  fleet_captain_report:     "Captain Report",
  fleet_distress_notice:    "Distress Notice",
  work_order_completed:     "Work Order Completed",
  work_order_assigned:      "Work Order Assigned",
  quote_submitted:          "Quote Submitted",
  quote_accepted:           "Quote Accepted",
  quote_declined:           "Quote Declined",
  access_granted:           "Access Granted",
  access_requested:         "Access Requested",
  announcement:             "Announcement",
  new_message:              "New Message",
};

const TYPE_COLORS: Record<string, { bg: string; dot: string; text: string }> = {
  fleet_distress_notice:    { bg: "bg-red-500/10",    dot: "bg-red-400",    text: "text-red-400"    },
  fleet_service_overdue:    { bg: "bg-red-500/10",    dot: "bg-red-400",    text: "text-red-400"    },
  fleet_service_approaching:{ bg: "bg-amber-500/10",  dot: "bg-amber-400",  text: "text-amber-400"  },
  fleet_captain_report:     { bg: "bg-sky-500/10",    dot: "bg-sky-400",    text: "text-sky-400"    },
  quote_submitted:          { bg: "bg-captain-500/10",dot: "bg-captain-400",text: "text-captain-400"},
  quote_accepted:           { bg: "bg-emerald-500/10",dot: "bg-emerald-400",text: "text-emerald-400"},
  quote_declined:           { bg: "bg-red-500/10",    dot: "bg-red-400",    text: "text-red-400"    },
  access_granted:           { bg: "bg-emerald-500/10",dot: "bg-emerald-400",text: "text-emerald-400"},
};

const DEFAULT_COLOR = { bg: "bg-white/[0.04]", dot: "bg-white/30", text: "text-white/50" };

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function AlertsPage() {
  const router = useRouter();
  const [selectedFleetId, setSelectedFleetId] = useState<Id<"fleets"> | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const a = api as any;
  const fleetList  = useQuery(a.fleetDashboard.listAllFleetsDashboard) ?? [];
  const notifs     = useQuery(api.notifications.getMyNotifications, { limit: 50 }) ?? [];
  const markRead   = useMutation(api.notifications.markAsRead);
  const markAll    = useMutation(api.notifications.markAllAsRead);
  const deleteN    = useMutation(api.notifications.deleteNotification);
  const clearRead  = useMutation(api.notifications.clearReadNotifications);

  if (fleetList.length > 0 && !selectedFleetId) setSelectedFleetId(fleetList[0]._id);

  const visible = filter === "unread" ? notifs.filter((n: any) => !n.isRead) : notifs;
  const unreadCount = notifs.filter((n: any) => !n.isRead).length;

  return (
    <div className="flex min-h-screen bg-[#0f1929]">
      <FleetSideNav
        selectedFleetId={selectedFleetId}
        fleets={fleetList}
        onFleetChange={setSelectedFleetId}
      />

      <main className="flex-1 min-w-0 overflow-x-hidden">
        {/* Header */}
        <div className="px-6 pt-8 pb-6 border-b border-white/[0.06]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Alerts</h1>
              <p className="text-sm text-white/40 mt-0.5">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAll({})}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-captain-300 border border-captain-500/30 hover:bg-captain-500/10 transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => clearRead({})}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/40 border border-white/[0.08] hover:bg-white/[0.05] transition-colors"
              >
                Clear read
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 mt-5">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  filter === f
                    ? "bg-captain-500/15 text-captain-300 border border-captain-500/20"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                }`}
              >
                {f}
                {f === "unread" && unreadCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-captain-500/30 text-captain-300">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications list */}
        <div className="px-6 py-6 space-y-2">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-white/20">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-sm">{filter === "unread" ? "No unread alerts" : "No alerts yet"}</p>
            </div>
          ) : (
            visible.map((n: any) => {
              const color = TYPE_COLORS[n.type] ?? DEFAULT_COLOR;
              return (
                <div
                  key={n._id}
                  className={`flex items-start gap-4 px-4 py-4 rounded-xl border transition-colors cursor-pointer group
                    ${n.isRead
                      ? "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04]"
                      : "border-captain-500/20 bg-captain-500/[0.05] hover:bg-captain-500/[0.08]"
                    }`}
                  onClick={() => !n.isRead && markRead({ notificationId: n._id })}
                >
                  {/* Type dot */}
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${n.isRead ? "bg-white/10" : color.dot}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-semibold uppercase tracking-widest ${color.text}`}>
                        {TYPE_LABELS[n.type] ?? n.type}
                      </span>
                      <span className="text-[10px] text-white/25">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className={`text-sm font-medium mt-0.5 ${n.isRead ? "text-white/50" : "text-white"}`}>
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="text-xs text-white/35 mt-0.5 line-clamp-2">{n.message}</p>
                    )}
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); deleteN({ notificationId: n._id }); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
