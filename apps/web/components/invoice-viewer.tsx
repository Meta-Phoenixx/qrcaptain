"use client";

import { useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

const a = api as any;

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function dateStr(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-white/[0.06] text-white/40",
  sent: "bg-captain-500/15 text-captain-300",
  viewed: "bg-sky-500/15 text-sky-300",
  paid: "bg-emerald-500/15 text-emerald-300",
  overdue: "bg-red-500/15 text-red-400",
  void: "bg-white/[0.04] text-white/25 line-through",
};

const LINE_TYPE_LABELS: Record<string, string> = {
  part: "Part / Material",
  labor_repair: "Labor — Repair",
  labor_fabrication: "Labor — Fabrication",
  diagnostic: "Diagnostic",
  sea_trial: "Sea Trial",
  travel: "Travel",
  discount: "Discount",
  other: "Other",
};

export function InvoiceViewer({
  invoiceId,
  onClose,
}: {
  invoiceId: Id<"invoices">;
  onClose: () => void;
}) {
  const invoice = useQuery(a.invoices.getInvoice, { invoiceId });
  const markViewed = useMutation(a.invoices.markInvoiceViewed);

  useEffect(() => {
    if (invoice && invoice.status === "sent") {
      markViewed({ invoiceId }).catch(() => {});
    }
  }, [invoice?.status]);

  if (!invoice) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="w-6 h-6 border-2 border-captain-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const vessel = invoice.vesselSnapshot ? JSON.parse(invoice.vesselSnapshot) : null;
  const partsLines = invoice.lineItems?.filter((l: any) => l.lineType === "part") ?? [];
  const laborLines = invoice.lineItems?.filter((l: any) => l.lineType.startsWith("labor")) ?? [];
  const feeLines = invoice.lineItems?.filter((l: any) => ["diagnostic", "sea_trial", "travel"].includes(l.lineType)) ?? [];
  const discountLines = invoice.lineItems?.filter((l: any) => l.lineType === "discount") ?? [];
  const otherLines = invoice.lineItems?.filter((l: any) => l.lineType === "other") ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl bg-[#0f1e30] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-white font-heading">{invoice.invoiceNumber}</h2>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-widest ${STATUS_STYLES[invoice.status] ?? ""}`}>
              {invoice.status}
            </span>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white text-2xl leading-none transition-colors">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* From / To */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-1.5">From</p>
              <p className="text-sm font-semibold text-white">{invoice.mechanicBusinessName ?? invoice.mechanicName}</p>
              {invoice.mechanicBusinessAddress && <p className="text-xs text-white/40 mt-0.5">{invoice.mechanicBusinessAddress}</p>}
              {invoice.mechanicPhone && <p className="text-xs text-white/40">{invoice.mechanicPhone}</p>}
              {invoice.mechanicEmail && <p className="text-xs text-white/40">{invoice.mechanicEmail}</p>}
              {invoice.mechanicDealerRegNumber && (
                <p className="text-[10px] text-white/25 mt-1">Dealer Reg: {invoice.mechanicDealerRegNumber}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-1.5">Bill To</p>
              <p className="text-sm font-semibold text-white">{invoice.customerName}</p>
              {invoice.customerCompany && <p className="text-xs text-white/40">{invoice.customerCompany}</p>}
              {invoice.customerTaxExempt && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <span className="text-[10px] text-emerald-400 font-medium">Tax Exempt</span>
                  {invoice.exemptionCertNumber && <span className="text-[10px] text-white/30">· Cert {invoice.exemptionCertNumber}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Vessel */}
          <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">Vessel</p>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">{vessel?.name ?? invoice.vesselName}</p>
                {vessel && <p className="text-xs text-white/40">{vessel.year} {vessel.make} {vessel.model} · {vessel.type}</p>}
              </div>
              <div className="text-right">
                {invoice.vesselHIN && <p className="text-[10px] text-white/30">HIN: <span className="font-mono text-white/50">{invoice.vesselHIN}</span></p>}
                {invoice.vesselDocNumber && <p className="text-[10px] text-white/30">Reg/Doc: <span className="font-mono text-white/50">{invoice.vesselDocNumber}</span></p>}
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="flex gap-6 text-sm">
            {invoice.issuedAt && <div><p className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">Issued</p><p className="text-white/70">{dateStr(invoice.issuedAt)}</p></div>}
            {invoice.dueAt && <div><p className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">Due</p><p className={invoice.status === "overdue" ? "text-red-400" : "text-white/70"}>{dateStr(invoice.dueAt)}</p></div>}
            {invoice.paymentTerms && <div><p className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">Terms</p><p className="text-white/70">{invoice.paymentTerms}</p></div>}
          </div>

          {/* Line items */}
          <div>
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">Line Items</p>
            <div className="space-y-1">
              {[...partsLines, ...laborLines, ...feeLines, ...otherLines, ...discountLines].map((line: any) => (
                <div key={line._id} className="flex items-start justify-between gap-3 py-2 border-b border-white/[0.04] last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-semibold uppercase tracking-widest text-white/25">{LINE_TYPE_LABELS[line.lineType] ?? line.lineType}</span>
                      {line.partNumber && <span className="text-[9px] font-mono text-white/20">{line.partNumber}</span>}
                      {!line.isTaxable && <span className="text-[9px] text-white/20">non-taxable</span>}
                    </div>
                    <p className="text-sm text-white/80 mt-0.5">{line.description}</p>
                    {line.quantity !== 1 && (
                      <p className="text-xs text-white/30 mt-0.5">{line.quantity} × {fmt(line.unitPrice)}</p>
                    )}
                  </div>
                  <p className={`text-sm font-medium tabular-nums flex-shrink-0 ${line.lineType === "discount" ? "text-red-400" : "text-white/80"}`}>
                    {line.lineType === "discount" ? `-${fmt(Math.abs(line.total))}` : fmt(line.total)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border border-white/[0.08] rounded-xl overflow-hidden">
            <div className="px-4 py-3 space-y-1.5 text-sm">
              {invoice.subtotalParts > 0 && <SummaryRow label="Parts" value={fmt(invoice.subtotalParts)} />}
              {invoice.subtotalLabor > 0 && <SummaryRow label="Labor (repair)" value={fmt(invoice.subtotalLabor)} />}
              {invoice.subtotalFabrication > 0 && <SummaryRow label="Labor (fabrication)" value={fmt(invoice.subtotalFabrication)} />}
              {invoice.subtotalDiagnostic > 0 && <SummaryRow label="Diagnostic / fees" value={fmt(invoice.subtotalDiagnostic)} />}
              {invoice.subtotalDiscount > 0 && <SummaryRow label="Discount" value={`-${fmt(invoice.subtotalDiscount)}`} red />}
              <div className="h-px bg-white/[0.06] my-1" />
              {invoice.customerTaxExempt ? (
                <SummaryRow label="Tax" value="Exempt" muted />
              ) : (
                <SummaryRow
                  label={`Tax — ${invoice.taxState} (${(invoice.taxRate * 100).toFixed(2)}%)`}
                  value={invoice.taxAmount > 0 ? fmt(invoice.taxAmount) : "—"}
                  muted={invoice.taxAmount === 0}
                />
              )}
              <div className="h-px bg-white/[0.06] my-1" />
              <SummaryRow label="Total" value={fmt(invoice.total)} bold />
              {invoice.amountPaid > 0 && <SummaryRow label="Amount Paid" value={fmt(invoice.amountPaid)} muted />}
              {invoice.balance > 0 && <SummaryRow label="Balance Due" value={fmt(invoice.balance)} bold red />}
            </div>
          </div>

          {/* Exemption detail */}
          {invoice.customerTaxExempt && (
            <div className="flex gap-2.5 px-4 py-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <div>
                <p className="text-xs font-medium text-emerald-400">Sales Tax Exempt</p>
                {invoice.exemptionType && <p className="text-[10px] text-emerald-300/60 mt-0.5 capitalize">{invoice.exemptionType.replace(/_/g, " ")}</p>}
                {invoice.exemptionCertNumber && <p className="text-[10px] text-emerald-300/50 font-mono">Certificate: {invoice.exemptionCertNumber}</p>}
                {invoice.exemptionAffidavitOnFile && <p className="text-[10px] text-emerald-300/50">Affidavit on file</p>}
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-1.5">Notes</p>
              <p className="text-sm text-white/50 whitespace-pre-wrap leading-relaxed">{invoice.notes}</p>
            </div>
          )}

          {/* Warranty */}
          {invoice.warrantyTerms && (
            <p className="text-[10px] text-white/25 leading-relaxed">
              <span className="font-semibold text-white/35">Warranty:</span> {invoice.warrantyTerms}
            </p>
          )}

          {/* Payment recorded notice */}
          {invoice.status === "paid" && invoice.paidAt && (
            <div className="flex gap-2.5 px-4 py-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20">
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="text-xs font-medium text-emerald-400">Payment Confirmed</p>
                <p className="text-[10px] text-emerald-300/60 mt-0.5">
                  {dateStr(invoice.paidAt)}
                  {invoice.paymentMethod && ` · ${invoice.paymentMethod}`}
                  {invoice.paymentReference && ` · Ref: ${invoice.paymentReference}`}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/[0.06] flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-medium border border-white/[0.10] text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, bold, red, muted }: { label: string; value: string; bold?: boolean; red?: boolean; muted?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className={`text-xs ${muted ? "text-white/25" : "text-white/50"}`}>{label}</span>
      <span className={`tabular-nums ${bold ? "text-white font-semibold" : red ? "text-red-400" : muted ? "text-white/25" : "text-white/80"}`}>{value}</span>
    </div>
  );
}
