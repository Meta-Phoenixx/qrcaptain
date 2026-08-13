"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

type Step = "tax_exempt_question" | "business_info" | "tax_exemption" | "complete";

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  companyName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  taxExempt: boolean | null;
  exemptionCertificateNumber: string;
  exemptionEffectiveDate: string;
  exemptionExpirationDate: string;
  exemptionCategory: string;
}

export function FleetManagerOnboarding() {
  const [step, setStep] = useState<Step>("tax_exempt_question");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    firstName: "",
    lastName: "",
    phone: "",
    companyName: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    taxExempt: null,
    exemptionCertificateNumber: "",
    exemptionEffectiveDate: "",
    exemptionExpirationDate: "",
    exemptionCategory: "",
  });

  const completeOnboarding = useMutation((api as any).users.completeFleetManagerOnboarding);

  function set(field: keyof FormData, value: string | boolean | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function businessInfoReady() {
    return (
      form.firstName.trim() &&
      form.lastName.trim() &&
      form.phone.trim() &&
      form.companyName.trim() &&
      form.street.trim() &&
      form.city.trim() &&
      form.state.trim() &&
      form.zipCode.trim()
    );
  }

  function exemptionReady() {
    return (
      /^[\d-]+$/.test(form.exemptionCertificateNumber.trim()) &&
      form.exemptionCertificateNumber.trim() &&
      form.exemptionEffectiveDate &&
      form.exemptionExpirationDate &&
      /^[a-zA-Z0-9\s]+$/.test(form.exemptionCategory.trim()) &&
      form.exemptionCategory.trim()
    );
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const effectiveMs = form.exemptionEffectiveDate
        ? new Date(form.exemptionEffectiveDate).getTime()
        : undefined;
      const expirationMs = form.exemptionExpirationDate
        ? new Date(form.exemptionExpirationDate).getTime()
        : undefined;

      await completeOnboarding({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        companyName: form.companyName.trim(),
        businessAddress: {
          street: form.street.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          zipCode: form.zipCode.trim(),
        },
        taxExempt: !!form.taxExempt,
        exemptionCertificateNumber: form.taxExempt ? form.exemptionCertificateNumber.trim() : undefined,
        exemptionEffectiveDate: form.taxExempt ? effectiveMs : undefined,
        exemptionExpirationDate: form.taxExempt ? expirationMs : undefined,
        exemptionCategory: form.taxExempt ? form.exemptionCategory.trim() : undefined,
      });
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2.5 rounded-xl text-sm bg-white/[0.04] border border-white/[0.10] text-white placeholder-white/30 focus:border-captain-500/60 focus:bg-white/[0.06] outline-none transition-colors";
  const labelCls = "block text-xs font-medium text-white/50 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1624]/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#0f1e30] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-captain-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-captain-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white font-heading tracking-tight">Fleet Manager Setup</h2>
          </div>
          <p className="text-sm text-white/40 mt-1">
            {step === "tax_exempt_question" && "Let's start with your tax status."}
            {step === "business_info" && "Tell us about your business."}
            {step === "tax_exemption" && "Enter your exemption certificate details."}
            {step === "complete" && "You're all set!"}
          </p>

          {/* Progress dots */}
          <div className="flex items-center gap-2 mt-4">
            {["tax_exempt_question", "business_info", ...(form.taxExempt ? ["tax_exemption"] : [])].map(
              (s, i) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${
                    step === s
                      ? "bg-captain-400 w-6"
                      : ["tax_exempt_question", "business_info", "tax_exemption"].indexOf(step) > i
                      ? "bg-captain-400/50 w-3"
                      : "bg-white/10 w-3"
                  }`}
                />
              )
            )}
          </div>
        </div>

        <div className="px-8 py-7">
          {/* Step 1: Tax exempt question */}
          {step === "tax_exempt_question" && (
            <div className="space-y-5">
              <p className="text-white/70 text-sm leading-relaxed">
                Does your organization operate as a non-profit or otherwise hold a Consumer's Certificate of Exemption for sales tax?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { set("taxExempt", true); setStep("business_info"); }}
                  className="flex flex-col items-center gap-2 px-4 py-5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-captain-500/10 hover:border-captain-500/30 text-white transition-colors group"
                >
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <span className="text-sm font-medium">Yes, we are tax exempt</span>
                </button>
                <button
                  onClick={() => { set("taxExempt", false); setStep("business_info"); }}
                  className="flex flex-col items-center gap-2 px-4 py-5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 text-white/70 transition-colors"
                >
                  <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-sm font-medium">No, not tax exempt</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Business info */}
          {step === "business_info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>First Name *</label>
                  <input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Jane" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Last Name *</label>
                  <input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Smith" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Phone *</label>
                <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(555) 000-0000" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Company / Organization Name *</label>
                <input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Sunset Charter Co." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Street Address *</label>
                <input value={form.street} onChange={(e) => set("street", e.target.value)} placeholder="123 Marina Blvd" className={inputCls} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className={labelCls}>City *</label>
                  <input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Miami" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>State *</label>
                  <input value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="FL" maxLength={2} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>ZIP *</label>
                  <input value={form.zipCode} onChange={(e) => set("zipCode", e.target.value)} placeholder="33101" className={inputCls} />
                </div>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep("tax_exempt_question")}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-white/70 border border-white/[0.08] hover:bg-white/[0.04] transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    if (!businessInfoReady()) return;
                    if (form.taxExempt) setStep("tax_exemption");
                    else handleSubmit();
                  }}
                  disabled={!businessInfoReady() || loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-captain-500 hover:bg-captain-400 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                >
                  {loading ? "Saving…" : form.taxExempt ? "Next: Exemption Details" : "Complete Setup"}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Tax exemption certificate */}
          {step === "tax_exemption" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20">
                <svg className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-emerald-300/80 leading-relaxed">
                  Enter details from your Consumer's Certificate of Exemption (Form DR-14 or equivalent). This information is stored securely and used only for tax compliance purposes.
                </p>
              </div>

              <div>
                <label className={labelCls}>Certificate Number * <span className="text-white/25 font-normal">(digits and dashes only)</span></label>
                <input
                  value={form.exemptionCertificateNumber}
                  onChange={(e) => set("exemptionCertificateNumber", e.target.value.replace(/[^0-9-]/g, ""))}
                  placeholder="85-8012345678C-0"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Effective Date *</label>
                  <input
                    type="date"
                    value={form.exemptionEffectiveDate}
                    onChange={(e) => set("exemptionEffectiveDate", e.target.value)}
                    className={inputCls + " [color-scheme:dark]"}
                  />
                </div>
                <div>
                  <label className={labelCls}>Expiration Date *</label>
                  <input
                    type="date"
                    value={form.exemptionExpirationDate}
                    onChange={(e) => set("exemptionExpirationDate", e.target.value)}
                    className={inputCls + " [color-scheme:dark]"}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Exemption Category * <span className="text-white/25 font-normal">(letters and numbers)</span></label>
                <input
                  value={form.exemptionCategory}
                  onChange={(e) => set("exemptionCategory", e.target.value.replace(/[^a-zA-Z0-9\s]/g, ""))}
                  placeholder="e.g. Nonprofit Organizations"
                  className={inputCls}
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep("business_info")}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-white/70 border border-white/[0.08] hover:bg-white/[0.04] transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!exemptionReady() || loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-captain-500 hover:bg-captain-400 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                >
                  {loading ? "Saving…" : "Complete Setup"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
