"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { AppSideNav } from "@/components/app-side-nav";
import { InvoiceBuilder } from "@/components/invoice-builder";
import { InvoiceViewer } from "@/components/invoice-viewer";
import { PaymentRecorder } from "@/components/payment-recorder";

const a = api as any;

const STATUS_TABS = [
  { key: "all",     label: "All" },
  { key: "draft",   label: "Draft" },
  { key: "sent",    label: "Sent" },
  { key: "viewed",  label: "Viewed" },
  { key: "overdue", label: "Overdue" },
  { key: "paid",    label: "Paid" },
];

const STATUS_STYLES: Record<string, { dot: string; text: string; bg: string; label: string }> = {
  draft:   { dot: "bg-white/20",    text: "text-white/40",    bg: "bg-white/[0.06]",     label: "Draft"   },
  sent:    { dot: "bg-captain-400", text: "text-captain-300", bg: "bg-captain-500/15",   label: "Sent"    },
  viewed:  { dot: "bg-sky-400",     text: "text-sky-300",     bg: "bg-sky-500/15",       label: "Viewed"  },
  paid:    { dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-500/15",   label: "Paid"    },
  overdue: { dot: "bg-red-400",     text: "text-red-400",     bg: "bg-red-500/15",       label: "Overdue" },
  void:    { dot: "bg-white/10",    text: "text-white/20",    bg: "bg-white/[0.03]",     label: "Void"    },
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function timeAgo(ts: number) {
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Mechanic view ────────────────────────────────────────────────────────────

function MechanicInvoicesPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [viewingId, setViewingId] = useState<Id<"invoices"> | null>(null);
  const [recordingPaymentId, setRecordingPaymentId] = useState<Id<"invoices"> | null>(null);
  const voidInvoice = useMutation(a.invoices.voidInvoice);

  const all = useQuery(a.invoices.getInvoicesByMechanic, {}) ?? [];
  const filtered = activeTab === "all" ? all : all.filter((i: any) => i.status === activeTab);

  const totals = {
    outstanding: all.filter((i: any) => ["sent", "viewed", "overdue"].includes(i.status)).reduce((s: number, i: any) => s + i.balance, 0),
    paid: all.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + i.total, 0),
    draft: all.filter((i: any) => i.status === "draft").length,
  };

  return (
    <div className="flex-1 min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="px-6 pt-8 pb-6 border-b border-white/[0.06]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Invoices</h1>
            <p className="text-sm text-white/40 mt-0.5">{all.length} total</p>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Outstanding</p>
            <p className="text-xl font-bold text-white mt-1">{fmt(totals.outstanding)}</p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
            <p className="text-[10px] font-semibold text-emerald-400/60 uppercase tracking-widest">Collected</p>
            <p className="text-xl font-bold text-emerald-300 mt-1">{fmt(totals.paid)}</p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Drafts</p>
            <p className="text-xl font-bold text-white mt-1">{totals.draft}</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mt-5 overflow-x-auto pb-0.5">
          {STATUS_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === t.key
                  ? "bg-captain-500/15 text-captain-300 border border-captain-500/20"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
              }`}
            >
              {t.label}
              {t.key !== "all" && (
                <span className="ml-1.5 text-[10px] text-white/25">
                  {all.filter((i: any) => i.status === t.key).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="px-6 py-6 space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-white/20">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">No invoices{activeTab !== "all" ? ` with status "${activeTab}"` : ""}</p>
          </div>
        ) : (
          filtered.map((inv: any) => {
            const s = STATUS_STYLES[inv.status] ?? STATUS_STYLES.draft;
            return (
              <div
                key={inv._id}
                className="flex items-center gap-4 px-4 py-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer group"
                onClick={() => setViewingId(inv._id)}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white font-mono">{inv.invoiceNumber}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-widest ${s.bg} ${s.text}`}>{s.label}</span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5 truncate">
                    {inv.customerName} · {inv.vesselName}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-white tabular-nums">{fmt(inv.total)}</p>
                  {inv.balance > 0 && inv.balance < inv.total && (
                    <p className="text-[10px] text-amber-400 tabular-nums">{fmt(inv.balance)} due</p>
                  )}
                  <p className="text-[10px] text-white/25 mt-0.5">{timeAgo(inv.createdAt)}</p>
                </div>

                {/* Actions — visible on hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                  {["sent", "viewed", "overdue"].includes(inv.status) && (
                    <button
                      onClick={() => setRecordingPaymentId(inv._id)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 transition-colors"
                    >
                      Record Payment
                    </button>
                  )}
                  {inv.status === "draft" && (
                    <button
                      onClick={() => setViewingId(inv._id)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-captain-500/15 hover:bg-captain-500/25 text-captain-300 transition-colors"
                    >
                      Edit & Send
                    </button>
                  )}
                  {!["paid", "void"].includes(inv.status) && (
                    <button
                      onClick={async () => {
                        if (confirm(`Void invoice ${inv.invoiceNumber}?`)) await voidInvoice({ invoiceId: inv._id });
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Void
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {viewingId && <InvoiceViewer invoiceId={viewingId} onClose={() => setViewingId(null)} isMechanic />}
      {recordingPaymentId && (
        <PaymentRecorder
          invoiceId={recordingPaymentId}
          invoicesApi={a.invoices}
          onClose={() => setRecordingPaymentId(null)}
          onRecorded={() => setRecordingPaymentId(null)}
        />
      )}
    </div>
  );
}

// ─── Customer (owner / fleet manager) view ────────────────────────────────────

function CustomerInvoicesPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [viewingId, setViewingId] = useState<Id<"invoices"> | null>(null);

  const all = useQuery(a.invoices.getInvoicesByCustomer, {}) ?? [];
  const filtered = activeTab === "all" ? all : all.filter((i: any) => i.status === activeTab);

  const outstanding = all.filter((i: any) => ["sent", "viewed", "overdue"].includes(i.status)).reduce((s: number, i: any) => s + i.balance, 0);

  return (
    <div className="flex-1 min-w-0 overflow-x-hidden">
      <div className="px-6 pt-8 pb-6 border-b border-white/[0.06]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Invoices</h1>
            <p className="text-sm text-white/40 mt-0.5">{all.length} total</p>
          </div>
          {outstanding > 0 && (
            <div className="px-4 py-2.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 text-right">
              <p className="text-[10px] text-amber-400/70 uppercase tracking-widest font-semibold">Balance Due</p>
              <p className="text-lg font-bold text-amber-300">{fmt(outstanding)}</p>
            </div>
          )}
        </div>

        <div className="flex gap-1 mt-5 overflow-x-auto pb-0.5">
          {STATUS_TABS.filter(t => t.key !== "draft").map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === t.key
                  ? "bg-captain-500/15 text-captain-300 border border-captain-500/20"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-6 space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-white/20">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">No invoices yet</p>
          </div>
        ) : (
          filtered.map((inv: any) => {
            const s = STATUS_STYLES[inv.status] ?? STATUS_STYLES.draft;
            return (
              <div
                key={inv._id}
                onClick={() => setViewingId(inv._id)}
                className="flex items-center gap-4 px-4 py-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white font-mono">{inv.invoiceNumber}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-widest ${s.bg} ${s.text}`}>{s.label}</span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5 truncate">
                    {inv.mechanicCompany ?? inv.mechanicName} · {inv.vesselName}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-white tabular-nums">{fmt(inv.total)}</p>
                  {inv.balance > 0 && inv.status !== "paid" && (
                    <p className="text-[10px] text-amber-400 tabular-nums">{fmt(inv.balance)} due</p>
                  )}
                  <p className="text-[10px] text-white/25 mt-0.5">{inv.issuedAt ? timeAgo(inv.issuedAt) : "Draft"}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {viewingId && <InvoiceViewer invoiceId={viewingId} onClose={() => setViewingId(null)} />}
    </div>
  );
}

// ─── Root page — route by role ────────────────────────────────────────────────

export default function InvoicesPage() {
  const me = useQuery(a.users.currentUser);

  if (!me) {
    return (
      <div className="flex min-h-screen bg-[#0f1929] items-center justify-center">
        <div className="w-6 h-6 border-2 border-captain-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isMechanic = me.role === "mechanic";
  const isFleetManager = me.role === "fleet_manager";

  if (isFleetManager) {
    return (
      <div className="flex min-h-screen bg-[#0f1929]">
        <AppSideNav />
        <CustomerInvoicesPage />
      </div>
    );
  }

  if (isMechanic) {
    return (
      <div className="flex min-h-screen bg-[#0f1929]">
        <AppSideNav />
        <MechanicInvoicesPage />
      </div>
    );
  }

  // Owner
  return (
    <div className="flex min-h-screen bg-[#0f1929]">
      <AppSideNav />
      <CustomerInvoicesPage />
    </div>
  );
}
