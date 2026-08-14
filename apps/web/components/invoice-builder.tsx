"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { ALL_STATES, getStateTaxRule } from "../../../convex/lib/stateTaxRules";

const a = api as any;

type LineType = "part" | "labor_repair" | "labor_fabrication" | "diagnostic" | "sea_trial" | "travel" | "discount" | "other";

interface LineItem {
  id: string;
  lineType: LineType;
  description: string;
  partNumber?: string;
  quantity: number;
  unitPrice: number;
  isTaxable: boolean;
  sortOrder: number;
}

const LINE_TYPE_LABELS: Record<LineType, string> = {
  part: "Part / Material",
  labor_repair: "Labor — Repair",
  labor_fabrication: "Labor — Fabrication",
  diagnostic: "Diagnostic",
  sea_trial: "Sea Trial",
  travel: "Travel",
  discount: "Discount",
  other: "Other",
};

const PAYMENT_TERMS = ["Due on receipt", "Net 7", "Net 15", "Net 30", "Net 45", "Net 60"];
const WARRANTY_OPTIONS = ["30 days", "90 days", "1 year", "Parts only — per manufacturer warranty", "No warranty"];

function uid() {
  return Math.random().toString(36).slice(2);
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function computeTotals(items: LineItem[], taxState: string, localRate: number, customerTaxExempt: boolean) {
  const rule = getStateTaxRule(taxState);
  const hasParts = items.some(l => l.lineType === "part" && l.isTaxable);
  const floridaBundled = taxState === "FL" && hasParts;

  let subtotalParts = 0, subtotalLabor = 0, subtotalFab = 0, subtotalDiag = 0, subtotalDiscount = 0;
  let taxableAmount = 0;

  for (const l of items) {
    const total = l.quantity * l.unitPrice;
    if (l.lineType === "part") subtotalParts += total;
    else if (l.lineType === "labor_repair") subtotalLabor += total;
    else if (l.lineType === "labor_fabrication") subtotalFab += total;
    else if (["diagnostic", "sea_trial", "travel"].includes(l.lineType)) subtotalDiag += total;
    else if (l.lineType === "discount") subtotalDiscount += Math.abs(total);

    if (!customerTaxExempt && rule && !rule.noSalesTax) {
      if (floridaBundled && l.lineType !== "discount") {
        taxableAmount += total;
      } else if (l.isTaxable && l.lineType !== "discount") {
        taxableAmount += total;
      }
    }
  }

  taxableAmount = Math.max(0, taxableAmount - subtotalDiscount);
  const taxRate = rule ? rule.stateRate + localRate : 0;
  let taxAmount = customerTaxExempt ? 0 : taxableAmount * taxRate;
  // FL $60k cap
  if (taxState === "FL" && taxAmount > 60000) taxAmount = 60000;

  const gross = items.filter(l => l.lineType !== "discount").reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const total = Math.max(0, gross - subtotalDiscount + taxAmount);

  return { subtotalParts, subtotalLabor, subtotalFab, subtotalDiag, subtotalDiscount, taxableAmount, taxRate, taxAmount, total };
}

export function InvoiceBuilder({
  workOrderId,
  onClose,
  onInvoiceCreated,
}: {
  workOrderId: Id<"workOrders">;
  onClose: () => void;
  onInvoiceCreated?: (invoiceId: Id<"invoices">) => void;
}) {
  const workOrder = useQuery(a.workOrders.getWorkOrder, { workOrderId });
  const existingInvoice = useQuery(a.invoices.getInvoiceForWorkOrder, { workOrderId });
  const createInvoice = useMutation(a.invoices.createInvoice);
  const updateDraft = useMutation(a.invoices.updateInvoiceDraft);
  const sendInvoice = useMutation(a.invoices.sendInvoice);

  const [taxState, setTaxState] = useState("FL");
  const [localRate, setLocalRate] = useState(0.01);
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [warrantyTerms, setWarrantyTerms] = useState("90 days");
  const [notes, setNotes] = useState("");
  const [dueInDays, setDueInDays] = useState(30);
  const [items, setItems] = useState<LineItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Pre-populate from work order data on first load
  useEffect(() => {
    if (!workOrder || initialized) return;
    setInitialized(true);
    const seed: LineItem[] = [];
    let order = 0;

    if (workOrder.workOrderParts) {
      for (const p of workOrder.workOrderParts) {
        seed.push({
          id: uid(), lineType: "part",
          description: p.name,
          partNumber: p.partNumber,
          quantity: p.quantity,
          unitPrice: p.unitCost ?? 0,
          isTaxable: true,
          sortOrder: order++,
        });
      }
    }
    if (workOrder.laborHours && workOrder.laborRate) {
      seed.push({
        id: uid(), lineType: "labor_repair",
        description: workOrder.workPerformed ? `Labor: ${workOrder.workPerformed.slice(0, 80)}` : "Repair labor",
        quantity: workOrder.laborHours,
        unitPrice: workOrder.laborRate,
        isTaxable: false,
        sortOrder: order++,
      });
    }
    if (seed.length === 0) {
      seed.push({ id: uid(), lineType: "labor_repair", description: "Repair labor", quantity: 1, unitPrice: 0, isTaxable: false, sortOrder: 0 });
    }
    setItems(seed);
  }, [workOrder, initialized]);

  const rule = getStateTaxRule(taxState);
  const totals = computeTotals(items, taxState, localRate, false); // customer exemption checked server-side
  const customerTaxExempt = (workOrder as any)?.customerTaxExempt ?? false; // will be resolved server-side

  function addLine(type: LineType) {
    setItems(prev => [...prev, {
      id: uid(), lineType: type, description: "",
      quantity: 1, unitPrice: 0,
      isTaxable: type === "part" || (!!rule && rule.laborTaxable && type.startsWith("labor")),
      sortOrder: prev.length,
    }]);
  }

  function updateLine(id: string, patch: Partial<LineItem>) {
    setItems(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  }

  function removeLine(id: string) {
    setItems(prev => prev.filter(l => l.id !== id).map((l, i) => ({ ...l, sortOrder: i })));
  }

  async function handleSaveDraft() {
    setSaving(true); setError(null);
    try {
      if (!existingInvoice) {
        const result = await createInvoice({ workOrderId, taxState, localRateAddOn: localRate, paymentTerms, notes, warrantyTerms, dueInDays, lineItems: items.map(l => ({ lineType: l.lineType, description: l.description, partNumber: l.partNumber, quantity: l.quantity, unitPrice: l.unitPrice, isTaxable: l.isTaxable, sortOrder: l.sortOrder })) });
        onInvoiceCreated?.(result.invoiceId);
      } else {
        await updateDraft({ invoiceId: existingInvoice._id, taxState, localRateAddOn: localRate, paymentTerms, notes, warrantyTerms, dueInDays, lineItems: items.map(l => ({ lineType: l.lineType, description: l.description, partNumber: l.partNumber, quantity: l.quantity, unitPrice: l.unitPrice, isTaxable: l.isTaxable, sortOrder: l.sortOrder })) });
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    setSending(true); setError(null);
    try {
      let invoiceId = existingInvoice?._id;
      if (!invoiceId) {
        const result = await createInvoice({ workOrderId, taxState, localRateAddOn: localRate, paymentTerms, notes, warrantyTerms, dueInDays, lineItems: items.map(l => ({ lineType: l.lineType, description: l.description, partNumber: l.partNumber, quantity: l.quantity, unitPrice: l.unitPrice, isTaxable: l.isTaxable, sortOrder: l.sortOrder })) });
        invoiceId = result.invoiceId;
        onInvoiceCreated?.(invoiceId);
      } else {
        await updateDraft({ invoiceId, taxState, localRateAddOn: localRate, paymentTerms, notes, warrantyTerms, dueInDays, lineItems: items.map(l => ({ lineType: l.lineType, description: l.description, partNumber: l.partNumber, quantity: l.quantity, unitPrice: l.unitPrice, isTaxable: l.isTaxable, sortOrder: l.sortOrder })) });
      }
      await sendInvoice({ invoiceId: invoiceId! });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Failed to send");
    } finally {
      setSending(false);
    }
  }

  const inputCls = "w-full px-2.5 py-1.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/25 focus:border-captain-500/50 focus:bg-white/[0.06] outline-none transition-colors";
  const labelCls = "block text-xs font-medium text-white/40 mb-1";

  if (!workOrder) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="w-6 h-6 border-2 border-captain-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-4xl bg-[#0f1e30] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-white font-heading">Create Invoice</h2>
            <p className="text-xs text-white/40 mt-0.5">
              {workOrder.vesselName ?? "Vessel"} · {existingInvoice ? existingInvoice.invoiceNumber : "Draft"}
            </p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white text-2xl leading-none transition-colors">×</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.06]">
            {/* Left: Line items */}
            <div className="lg:col-span-2 px-6 py-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Line Items</h3>
              </div>

              {/* Column headers */}
              <div className="hidden sm:grid grid-cols-12 gap-2 text-[10px] font-medium text-white/25 uppercase tracking-widest px-1">
                <span className="col-span-4">Description</span>
                <span className="col-span-2">Type</span>
                <span className="col-span-1 text-right">Qty</span>
                <span className="col-span-2 text-right">Unit Price</span>
                <span className="col-span-2 text-right">Total</span>
                <span className="col-span-1 text-center">Tax</span>
              </div>

              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-start bg-white/[0.02] border border-white/[0.06] rounded-xl p-2">
                    <div className="col-span-12 sm:col-span-4">
                      <input
                        value={item.description}
                        onChange={e => updateLine(item.id, { description: e.target.value })}
                        placeholder="Description"
                        className={inputCls}
                      />
                      {item.lineType === "part" && (
                        <input
                          value={item.partNumber ?? ""}
                          onChange={e => updateLine(item.id, { partNumber: e.target.value })}
                          placeholder="Part # (optional)"
                          className={`${inputCls} mt-1 text-xs`}
                        />
                      )}
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <select
                        value={item.lineType}
                        onChange={e => updateLine(item.id, { lineType: e.target.value as LineType })}
                        className={inputCls}
                      >
                        {Object.entries(LINE_TYPE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3 sm:col-span-1">
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={item.quantity}
                        onChange={e => updateLine(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                        className={`${inputCls} text-right`}
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30 text-sm">$</span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.unitPrice}
                          onChange={e => updateLine(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                          className={`${inputCls} pl-5 text-right`}
                        />
                      </div>
                    </div>
                    <div className="col-span-3 sm:col-span-2 text-right pt-1.5">
                      <span className="text-sm font-medium text-white">{fmt(item.quantity * item.unitPrice)}</span>
                    </div>
                    <div className="col-span-3 sm:col-span-1 flex items-center justify-center gap-2 pt-1">
                      <button
                        onClick={() => updateLine(item.id, { isTaxable: !item.isTaxable })}
                        className={`w-8 h-4 rounded-full transition-colors relative ${item.isTaxable ? "bg-captain-500" : "bg-white/10"}`}
                        title={item.isTaxable ? "Taxable" : "Non-taxable"}
                      >
                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${item.isTaxable ? "left-4" : "left-0.5"}`} />
                      </button>
                      <button
                        onClick={() => removeLine(item.id)}
                        className="text-white/20 hover:text-red-400 transition-colors text-sm"
                      >×</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add line buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                {(["part", "labor_repair", "labor_fabrication", "diagnostic", "sea_trial", "travel", "discount", "other"] as LineType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => addLine(type)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/50 hover:text-white/80 transition-colors"
                  >
                    + {LINE_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>

              {/* FL special rule warning */}
              {taxState === "FL" && items.some(l => l.lineType === "part") && (
                <div className="flex gap-2.5 px-4 py-3 rounded-xl bg-amber-500/[0.08] border border-amber-500/20">
                  <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs text-amber-300/80 leading-relaxed">
                    <strong>Florida rule:</strong> Because this invoice includes parts, the entire charge — labor and parts — is taxable. Tax is calculated on the full invoice (FL Rule 12A-1.0071). A single repair event caps at $60,000 in tax.
                  </p>
                </div>
              )}

              {/* Separately-stated state tip */}
              {rule && !rule.laborTaxable && rule.laborTaxableWhenBundled && taxState !== "FL" && (
                <div className="flex gap-2.5 px-4 py-3 rounded-xl bg-sky-500/[0.06] border border-sky-500/15">
                  <svg className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-sky-300/80 leading-relaxed">
                    <strong>{rule.name}:</strong> Labor is exempt only when separately stated. If labor and parts are combined on the same line, the full amount is taxable. Keep labor and parts as separate line items.
                  </p>
                </div>
              )}
            </div>

            {/* Right: Settings + totals */}
            <div className="px-6 py-5 space-y-5">
              {/* Tax settings */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Tax Settings</h3>
                <div>
                  <label className={labelCls}>Service State</label>
                  <select value={taxState} onChange={e => setTaxState(e.target.value)} className={inputCls}>
                    {ALL_STATES.map(s => (
                      <option key={s.code} value={s.code}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>County / Local Rate Add-On</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={0.1}
                      step={0.0025}
                      value={(localRate * 100).toFixed(2)}
                      onChange={e => setLocalRate((parseFloat(e.target.value) || 0) / 100)}
                      className={`${inputCls} pr-6`}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 text-xs">%</span>
                  </div>
                  {rule && (
                    <p className="text-[10px] text-white/30 mt-1">
                      State base: {(rule.stateRate * 100).toFixed(2)}% + local: {(localRate * 100).toFixed(2)}% = {((rule.stateRate + localRate) * 100).toFixed(2)}% total
                      {rule.noSalesTax ? " · No sales tax" : ""}
                      {rule.grossReceiptsTax ? " · Gross Receipts Tax (GRT)" : ""}
                    </p>
                  )}
                </div>
                {rule?.specialRule && (
                  <p className="text-[10px] text-amber-300/70 leading-relaxed border-l-2 border-amber-500/30 pl-2">{rule.specialRule}</p>
                )}
              </div>

              {/* Terms */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Terms</h3>
                <div>
                  <label className={labelCls}>Payment Terms</label>
                  <select value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} className={inputCls}>
                    {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Warranty</label>
                  <select value={warrantyTerms} onChange={e => setWarrantyTerms(e.target.value)} className={inputCls}>
                    {WARRANTY_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Notes to Customer</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Additional notes, payment instructions, lien notice, etc."
                    className={`${inputCls} resize-none`}
                  />
                </div>
              </div>

              {/* Totals */}
              <div className="border border-white/[0.08] rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-white/[0.03] border-b border-white/[0.06]">
                  <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Summary</h3>
                </div>
                <div className="px-4 py-3 space-y-1.5 text-sm">
                  {totals.subtotalParts > 0 && <Row label="Parts" value={fmt(totals.subtotalParts)} />}
                  {totals.subtotalLabor > 0 && <Row label="Labor (repair)" value={fmt(totals.subtotalLabor)} />}
                  {totals.subtotalFab > 0 && <Row label="Labor (fabrication)" value={fmt(totals.subtotalFab)} />}
                  {totals.subtotalDiag > 0 && <Row label="Diagnostic / fees" value={fmt(totals.subtotalDiag)} />}
                  {totals.subtotalDiscount > 0 && <Row label="Discount" value={`-${fmt(totals.subtotalDiscount)}`} red />}
                  <div className="h-px bg-white/[0.06] my-1" />
                  <Row label={`Tax (${(totals.taxRate * 100).toFixed(2)}%)`} value={fmt(totals.taxAmount)} muted={totals.taxAmount === 0} />
                  <div className="h-px bg-white/[0.06] my-1" />
                  <Row label="Total Due" value={fmt(totals.total)} bold />
                </div>
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={handleSend}
                  disabled={sending || saving || items.length === 0}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-captain-500 hover:bg-captain-400 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                >
                  {sending ? "Sending…" : "Send Invoice to Customer"}
                </button>
                <button
                  onClick={handleSaveDraft}
                  disabled={saving || sending || items.length === 0}
                  className="w-full py-2 rounded-xl text-sm font-medium border border-white/[0.10] text-white/50 hover:text-white/80 hover:bg-white/[0.04] disabled:opacity-40 transition-colors"
                >
                  {saving ? "Saving…" : "Save as Draft"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, red, muted }: { label: string; value: string; bold?: boolean; red?: boolean; muted?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className={`text-xs ${muted ? "text-white/25" : "text-white/50"}`}>{label}</span>
      <span className={`tabular-nums ${bold ? "text-white font-semibold" : red ? "text-red-400" : muted ? "text-white/25" : "text-white/80"}`}>{value}</span>
    </div>
  );
}
