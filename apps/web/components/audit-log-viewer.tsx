"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTheme } from "./providers/theme-provider";
import { ShieldCheck, User, Clock, Filter, ChevronDown } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  "vessel.created": "Vessel Created",
  "vessel.updated": "Vessel Updated",
  "vessel.deleted": "Vessel Deleted",
  "vessel.mechanic_authorized": "Mechanic Authorized",
  "vessel.mechanic_authorization_revoked": "Authorization Revoked",
  "work_order.created": "Work Order Created",
  "work_order.status_changed": "Status Changed",
  "work_order.quote_submitted": "Quote Submitted",
  "work_order.quote_accepted": "Quote Accepted",
  "work_order.quote_declined": "Quote Declined",
  "work_order.completed": "Work Order Completed",
  "work_order.cancelled": "Work Order Cancelled",
  "user.role_changed": "Role Changed",
  "user.profile_updated": "Profile Updated",
  "user.onboarding_completed": "Onboarding Completed",
  "access_request.created": "Access Requested",
  "access_request.approved": "Access Approved",
  "access_request.denied": "Access Denied",
  "rating.mechanic_rated": "Mechanic Rated",
  "rating.owner_rated": "Owner Rated",
  "admin.announcement_created": "Announcement Created",
  "admin.announcement_updated": "Announcement Updated",
  "admin.setting_changed": "Setting Changed",
  "admin.user_promoted": "User Promoted",
};

const ACTION_COLORS: Record<string, string> = {
  "vessel.": "bg-blue-500/20 text-blue-400",
  "work_order.": "bg-amber-500/20 text-amber-400",
  "user.": "bg-purple-500/20 text-purple-400",
  "access_request.": "bg-green-500/20 text-green-400",
  "rating.": "bg-pink-500/20 text-pink-400",
  "admin.": "bg-red-500/20 text-red-400",
};

function getActionColor(action: string) {
  for (const prefix of Object.keys(ACTION_COLORS)) {
    if (action.startsWith(prefix)) return ACTION_COLORS[prefix];
  }
  return "bg-gray-500/20 text-gray-400";
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function AuditLogViewer() {
  const { mode } = useTheme();
  const [actionFilter, setActionFilter] = useState("");
  const [limit, setLimit] = useState(50);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const auditLogsApi = (api as any).auditLogs;
  const logs = useQuery(auditLogsApi?.list, {
    limit,
    action: actionFilter || undefined,
  });
  const distinctActions = useQuery(auditLogsApi?.getDistinctActions, {});

  const isDark = mode === "dark";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? "bg-captain-500/20" : "bg-captain-100"}`}>
            <ShieldCheck className="w-5 h-5 text-captain-600" />
          </div>
          <div>
            <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Audit Log</h2>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Immutable record of all important system actions
            </p>
          </div>
        </div>
        <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          {logs?.length ?? "—"} entries
        </span>
      </div>

      {/* Filters */}
      <div className={`flex flex-wrap gap-3 p-4 rounded-xl border ${isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}>
        <div className="flex items-center gap-2">
          <Filter className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
          <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>Filter:</span>
        </div>

        <div className="relative">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className={`appearance-none pl-3 pr-8 py-1.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-captain-500 ${
              isDark
                ? "bg-white/10 border-white/10 text-white"
                : "bg-white border-gray-300 text-gray-900"
            }`}
          >
            <option value="">All actions</option>
            {(distinctActions ?? []).map((a: string) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a] ?? a}
              </option>
            ))}
          </select>
          <ChevronDown className={`absolute right-2 top-2 w-4 h-4 pointer-events-none ${isDark ? "text-gray-400" : "text-gray-500"}`} />
        </div>

        <div className="relative">
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className={`appearance-none pl-3 pr-8 py-1.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-captain-500 ${
              isDark
                ? "bg-white/10 border-white/10 text-white"
                : "bg-white border-gray-300 text-gray-900"
            }`}
          >
            <option value={25}>25 entries</option>
            <option value={50}>50 entries</option>
            <option value={100}>100 entries</option>
            <option value={200}>200 entries</option>
          </select>
          <ChevronDown className={`absolute right-2 top-2 w-4 h-4 pointer-events-none ${isDark ? "text-gray-400" : "text-gray-500"}`} />
        </div>
      </div>

      {/* Log Table */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? "border-white/10" : "border-gray-200"}`}>
        {logs === undefined ? (
          <div className={`flex items-center justify-center h-32 ${isDark ? "bg-white/5" : "bg-white"}`}>
            <div className="w-6 h-6 border-2 border-captain-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-32 gap-2 ${isDark ? "bg-white/5" : "bg-white"}`}>
            <ShieldCheck className={`w-8 h-8 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>No audit log entries found</p>
          </div>
        ) : (
          <div className={`divide-y ${isDark ? "divide-white/5" : "divide-gray-100"}`}>
            {/* Table header */}
            <div className={`grid grid-cols-12 px-4 py-2 text-xs font-medium uppercase tracking-wider ${isDark ? "bg-white/5 text-gray-400" : "bg-gray-50 text-gray-500"}`}>
              <div className="col-span-3">Action</div>
              <div className="col-span-3">Actor</div>
              <div className="col-span-3">Target</div>
              <div className="col-span-2">Details</div>
              <div className="col-span-1 text-right">When</div>
            </div>

            {((logs ?? []) as any[]).map((log) => (
              <div
                key={log._id}
                className={`grid grid-cols-12 px-4 py-3 gap-2 text-sm ${isDark ? "bg-white/2 hover:bg-white/5" : "bg-white hover:bg-gray-50"} transition-colors`}
              >
                {/* Action */}
                <div className="col-span-3 flex items-center">
                  <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${getActionColor(log.action)}`}>
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                </div>

                {/* Actor */}
                <div className="col-span-3 flex items-center gap-1.5 min-w-0">
                  <User className={`w-3.5 h-3.5 shrink-0 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                  <div className="min-w-0">
                    <p className={`truncate text-xs font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                      {log.actorName}
                    </p>
                    {log.actorRole && (
                      <p className={`text-xs truncate ${isDark ? "text-gray-500" : "text-gray-400"}`}>{log.actorRole}</p>
                    )}
                  </div>
                </div>

                {/* Target */}
                <div className="col-span-3 flex items-center min-w-0">
                  {log.targetType ? (
                    <div className="min-w-0">
                      <p className={`text-xs font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>{log.targetType}</p>
                      {log.targetId && (
                        <p className={`text-xs font-mono truncate ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                          {log.targetId.slice(-8)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className={`text-xs ${isDark ? "text-gray-600" : "text-gray-300"}`}>—</span>
                  )}
                </div>

                {/* Metadata */}
                <div className="col-span-2 flex items-center min-w-0">
                  {log.metadata ? (
                    <details className="w-full">
                      <summary className={`text-xs cursor-pointer ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        View
                      </summary>
                      <pre className={`mt-1 text-xs p-2 rounded overflow-auto max-h-24 ${isDark ? "bg-white/5 text-gray-300" : "bg-gray-50 text-gray-700"}`}>
                        {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                      </pre>
                    </details>
                  ) : (
                    <span className={`text-xs ${isDark ? "text-gray-600" : "text-gray-300"}`}>—</span>
                  )}
                </div>

                {/* Timestamp */}
                <div className={`col-span-1 flex items-center justify-end gap-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  <Clock className="w-3 h-3 shrink-0" />
                  <span className="text-xs whitespace-nowrap" title={new Date(log.createdAt).toLocaleString()}>
                    {formatRelativeTime(log.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
