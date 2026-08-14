"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";

const PAYMENT_METHODS = ["Check", "Cash", "Zelle", "Venmo", "ACH / Wire", "Credit Card", "Money Order", "Other"];

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function PaymentRecorder({
  invoiceId,
  invoicesApi,
  onClose,
  onRecorded,
}: {
  invoiceId: Id<"invoices">;
  invoicesApi: any;
  onClose: () => void;
  onRecorded?: () => void;
}) {
  const invoice = useQuery(invoicesApi.getInvoice, { invoiceId });
  const recordPayment = useMutation(invoicesApi.recordPayment);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Check");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!invoice) return null;

  const balance = invoice.balance ?? invoice.total;
  const amountNum = parseFloat(amount) || 0;
  const newBalance = Math.max(0, balance - amountNum);
  const willFullyPay = newBalance <= 0;

  async function handleSubmit() {
    if (amountNum <= 0) { setError("Enter a payment amount."); return; }
    if (amountNum > balance + 0.01) { setError(`Amount exceeds the outstanding balance of ${fmt(balance)}.`); return; }
    setSaving(true); setError(null);
    try {
      await recordPayment({
        invoiceId,
        amount: amountNum,
        paymentMethod: method,
        paymentReference: reference.trim() || undefined,
        paymentNotes: notes.trim() || undefined,
      });
      onRecorded?.();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Failed to record payment.");
      setSaving(false);
    }
  }

  const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/25 focus:border-captain-500/50 focus:bg-white/[0.06] outline-none transition-colors";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#0f1e30] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-base font-bold text-white font-heading">Record Payment</h3>
            <p className="text-xs text-white/40 mt-0.5">{invoice.invoiceNumber}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white text-2xl leading-none transition-colors">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Balance summary */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div>
              <p className="text-xs text-white/40">Invoice Total</p>
              <p className="text-sm font-semibold text-white">{fmt(invoice.total)}</p>
            </div>
            {invoice.amountPaid > 0 && (
              <div className="text-right">
                <p className="text-xs text-white/40">Previously Paid</p>
                <p className="text-sm text-emerald-400">{fmt(invoice.amountPaid)}</p>
              </div>
            )}
            <div className="text-right">
              <p className="text-xs text-white/40">Balance Due</p>
              <p className="text-base font-bold text-white">{fmt(balance)}</p>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-white/40 mb-1.5">Payment Amount *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">$</span>
              <input
                type="number"
                min={0.01}
                step={0.01}
                max={balance}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={balance.toFixed(2)}
                className={`${inputCls} pl-6`}
              />
            </div>
            <div className="flex gap-2 mt-1.5">
              <button
                onClick={() => setAmount(balance.toFixed(2))}
                className="text-[10px] px-2 py-0.5 rounded bg-captain-500/15 text-captain-400 hover:bg-captain-500/25 transition-colors"
              >
                Full balance ({fmt(balance)})
              </button>
            </div>
          </div>

          {/* Method */}
          <div>
            <label className="block text-xs font-medium text-white/40 mb-1.5">Payment Method *</label>
            <select value={method} onChange={e => setMethod(e.target.value)} className={inputCls}>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-xs font-medium text-white/40 mb-1.5">
              Reference <span className="text-white/20 font-normal">(check #, transfer ID, etc.)</span>
            </label>
            <input
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="e.g. Check #1042"
              className={inputCls}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-white/40 mb-1.5">Notes <span className="text-white/20 font-normal">(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any payment notes"
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Preview */}
          {amountNum > 0 && (
            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border ${
              willFullyPay
                ? "bg-emerald-500/[0.08] border-emerald-500/20"
                : "bg-white/[0.03] border-white/[0.06]"
            }`}>
              {willFullyPay ? (
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white/30 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <p className={`text-xs ${willFullyPay ? "text-emerald-300" : "text-white/40"}`}>
                {willFullyPay
                  ? "This payment will mark the invoice as fully paid."
                  : `Remaining balance after this payment: ${fmt(newBalance)}`}
              </p>
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSubmit}
              disabled={saving || amountNum <= 0}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-captain-500 hover:bg-captain-400 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
            >
              {saving ? "Recording…" : "Record Payment"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium border border-white/[0.10] text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
