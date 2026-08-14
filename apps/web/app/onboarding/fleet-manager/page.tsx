"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

type FleetType = "charter" | "fishing" | "racing" | "leisure" | "commercial";

type Step = "logo" | "business_info" | "tax_exempt" | "tax_exemption" | "create_fleet";

interface FormData {
  // Logo
  logoFile: File | null;
  logoPreview: string | null;
  logoStorageId: Id<"_storage"> | null;
  // Business info
  firstName: string;
  lastName: string;
  phone: string;
  companyName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  // Tax
  taxExempt: boolean | null;
  exemptionCertificateNumber: string;
  exemptionEffectiveDate: string;
  exemptionExpirationDate: string;
  exemptionCategory: string;
  // Fleet
  fleetName: string;
  fleetType: FleetType | "";
  fleetDescription: string;
}

const FLEET_TYPES: { value: FleetType; label: string; icon: string }[] = [
  { value: "charter", label: "Charter", icon: "⚓" },
  { value: "fishing", label: "Fishing", icon: "🎣" },
  { value: "racing", label: "Racing", icon: "🏁" },
  { value: "leisure", label: "Leisure", icon: "🌅" },
  { value: "commercial", label: "Commercial", icon: "🚢" },
];

const STEPS: Step[] = ["logo", "business_info", "tax_exempt", "create_fleet"];

function stepIndex(step: Step, taxExempt: boolean | null) {
  const base: Step[] = ["logo", "business_info", "tax_exempt"];
  if (taxExempt === true) base.push("tax_exemption");
  base.push("create_fleet");
  return base.indexOf(step);
}

function totalSteps(taxExempt: boolean | null) {
  return taxExempt === true ? 5 : 4;
}

export default function FleetManagerOnboardingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("logo");
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    logoFile: null,
    logoPreview: null,
    logoStorageId: null,
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
    fleetName: "",
    fleetType: "",
    fleetDescription: "",
  });

  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const completeOnboarding = useMutation((api as any).users.completeFleetManagerOnboarding);
  const createFleet = useMutation(api.fleets.createFleet);

  function set<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const handleLogoSelect = useCallback(async (file: File) => {
    const preview = URL.createObjectURL(file);
    set("logoFile", file);
    set("logoPreview", preview);
    setError(null);

    setUploadingLogo(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = await res.json();
      set("logoStorageId", storageId as Id<"_storage">);
    } catch (e: any) {
      setError("Logo upload failed. You can continue without it or try again.");
      set("logoFile", null);
      set("logoPreview", null);
    } finally {
      setUploadingLogo(false);
    }
  }, [generateUploadUrl]);

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
      form.exemptionCertificateNumber.trim() &&
      /^[\d-]+$/.test(form.exemptionCertificateNumber.trim()) &&
      form.exemptionEffectiveDate &&
      form.exemptionExpirationDate &&
      form.exemptionCategory.trim() &&
      /^[a-zA-Z0-9\s]+$/.test(form.exemptionCategory.trim())
    );
  }

  function fleetReady() {
    return form.fleetName.trim().length > 0;
  }

  async function handleFinish() {
    setLoading(true);
    setError(null);
    try {
      // 1. Complete onboarding
      await completeOnboarding({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        companyName: form.companyName.trim(),
        businessAddress: {
          street: form.street.trim(),
          city: form.city.trim(),
          state: form.state.trim().toUpperCase(),
          zipCode: form.zipCode.trim(),
        },
        taxExempt: !!form.taxExempt,
        ...(form.taxExempt && {
          exemptionCertificateNumber: form.exemptionCertificateNumber.trim(),
          exemptionEffectiveDate: form.exemptionEffectiveDate
            ? new Date(form.exemptionEffectiveDate).getTime()
            : undefined,
          exemptionExpirationDate: form.exemptionExpirationDate
            ? new Date(form.exemptionExpirationDate).getTime()
            : undefined,
          exemptionCategory: form.exemptionCategory.trim(),
        }),
        ...(form.logoStorageId && { companyLogoStorageId: form.logoStorageId }),
      });

      // 2. Create first fleet
      await createFleet({
        name: form.fleetName.trim(),
        ...(form.fleetType && { fleetType: form.fleetType as FleetType }),
        ...(form.fleetDescription.trim() && { description: form.fleetDescription.trim() }),
      });

      router.replace("/fleet");
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const currentIndex = stepIndex(step, form.taxExempt);
  const total = totalSteps(form.taxExempt);

  const inputCls =
    "w-full px-3 py-2.5 rounded-xl text-sm bg-white/[0.04] border border-white/[0.10] text-white placeholder-white/30 focus:border-captain-500/60 focus:bg-white/[0.06] outline-none transition-colors";
  const labelCls = "block text-xs font-medium text-white/50 mb-1.5";

  return (
    <div className="min-h-screen bg-[#080f1a] flex items-center justify-center p-4">
      {/* Background radial */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-captain-500/[0.06] blur-[120px]" />
      </div>

      <div className="relative w-full max-w-xl">
        {/* Logo mark */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-xl bg-captain-500/20 border border-captain-500/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-captain-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-white/60 tracking-widest uppercase font-heading">QR Captain</span>
        </div>

        {/* Card */}
        <div className="bg-[#0f1e30] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          {/* Progress bar */}
          <div className="h-0.5 bg-white/[0.04]">
            <div
              className="h-full bg-captain-500 transition-all duration-500"
              style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
            />
          </div>

          {/* Header */}
          <div className="px-8 pt-7 pb-5 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-captain-400/70 uppercase tracking-[0.15em] mb-0.5">
                  Step {currentIndex + 1} of {total}
                </p>
                <h1 className="text-xl font-bold text-white font-heading tracking-tight">
                  {step === "logo" && "Add Your Company Logo"}
                  {step === "business_info" && "Business Information"}
                  {step === "tax_exempt" && "Tax Exemption Status"}
                  {step === "tax_exemption" && "Exemption Certificate"}
                  {step === "create_fleet" && "Create Your First Fleet"}
                </h1>
                <p className="text-sm text-white/35 mt-0.5">
                  {step === "logo" && "Upload your logo so it appears on invoices and your profile."}
                  {step === "business_info" && "This information appears on all invoices you receive."}
                  {step === "tax_exempt" && "Determines how mechanics calculate sales tax on your invoices."}
                  {step === "tax_exemption" && "Enter your Consumer's Certificate of Exemption details."}
                  {step === "create_fleet" && "You can add vessels and mechanics after setup."}
                </p>
              </div>
            </div>

            {/* Step dots */}
            <div className="flex items-center gap-1.5 mt-5">
              {Array.from({ length: total }).map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === currentIndex
                      ? "w-6 h-1.5 bg-captain-400"
                      : i < currentIndex
                      ? "w-3 h-1.5 bg-captain-400/40"
                      : "w-3 h-1.5 bg-white/10"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Step content */}
          <div className="px-8 py-7">

            {/* ── STEP 1: LOGO ── */}
            {step === "logo" && (
              <div className="space-y-5">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed cursor-pointer transition-colors group
                    ${form.logoPreview
                      ? "border-captain-500/40 bg-captain-500/[0.04]"
                      : "border-white/10 bg-white/[0.02] hover:border-captain-500/30 hover:bg-captain-500/[0.03]"
                    }`}
                  style={{ minHeight: 200 }}
                >
                  {form.logoPreview ? (
                    <div className="flex flex-col items-center gap-3 p-6">
                      <div className="w-28 h-28 rounded-2xl overflow-hidden bg-white/[0.06] border border-white/10 flex items-center justify-center">
                        <img src={form.logoPreview} alt="Company logo" className="w-full h-full object-contain" />
                      </div>
                      {uploadingLogo ? (
                        <div className="flex items-center gap-2 text-captain-400 text-xs">
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Uploading…
                        </div>
                      ) : form.logoStorageId ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          Uploaded
                        </div>
                      ) : null}
                      <p className="text-xs text-white/30">Click to change</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 p-8">
                      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center group-hover:bg-captain-500/[0.08] group-hover:border-captain-500/20 transition-colors">
                        <svg className="w-7 h-7 text-white/20 group-hover:text-captain-400/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-white/50 group-hover:text-white/70 transition-colors">Click to upload logo</p>
                        <p className="text-xs text-white/25 mt-0.5">PNG, JPG, SVG — max 5MB</p>
                      </div>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoSelect(file);
                  }}
                />

                {error && <p className="text-sm text-amber-400">{error}</p>}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => { setError(null); setStep("business_info"); }}
                    disabled={uploadingLogo}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-white/60 border border-white/[0.08] hover:bg-white/[0.03] disabled:opacity-40 transition-colors"
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={() => { setError(null); setStep("business_info"); }}
                    disabled={uploadingLogo}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-captain-500 hover:bg-captain-400 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                  >
                    {uploadingLogo ? "Uploading…" : "Continue"}
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: BUSINESS INFO ── */}
            {step === "business_info" && (
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Official Business Name *</label>
                  <input
                    value={form.companyName}
                    onChange={(e) => set("companyName", e.target.value)}
                    placeholder="Sunset Charter Co., LLC"
                    className={inputCls}
                    autoFocus
                  />
                </div>
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
                  <label className={labelCls}>Business Phone *</label>
                  <input
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="(555) 000-0000"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Street Address *</label>
                  <input value={form.street} onChange={(e) => set("street", e.target.value)} placeholder="123 Marina Blvd" className={inputCls} />
                </div>
                <div className="grid grid-cols-5 gap-3">
                  <div className="col-span-2">
                    <label className={labelCls}>City *</label>
                    <input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Miami" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>State *</label>
                    <input value={form.state} onChange={(e) => set("state", e.target.value.toUpperCase())} placeholder="FL" maxLength={2} className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>ZIP Code *</label>
                    <input value={form.zipCode} onChange={(e) => set("zipCode", e.target.value)} placeholder="33101" className={inputCls} />
                  </div>
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setError(null); setStep("logo"); }}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-white/70 border border-white/[0.08] hover:bg-white/[0.04] transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => { setError(null); setStep("tax_exempt"); }}
                    disabled={!businessInfoReady()}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-captain-500 hover:bg-captain-400 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: TAX EXEMPT QUESTION ── */}
            {step === "tax_exempt" && (
              <div className="space-y-5">
                <p className="text-white/60 text-sm leading-relaxed">
                  Does your organization operate as a non-profit or hold a Consumer's Certificate of Exemption for sales tax? This affects how mechanics calculate tax on invoices sent to you.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { set("taxExempt", true); setStep("tax_exemption"); }}
                    className={`flex flex-col items-center gap-3 px-4 py-6 rounded-2xl border transition-all group
                      ${form.taxExempt === true
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-white/[0.08] bg-white/[0.02] hover:bg-emerald-500/[0.07] hover:border-emerald-500/25"
                      }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-white">Yes, tax exempt</p>
                      <p className="text-xs text-white/35 mt-0.5">I have a certificate</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { set("taxExempt", false); setStep("create_fleet"); }}
                    className={`flex flex-col items-center gap-3 px-4 py-6 rounded-2xl border transition-all group
                      ${form.taxExempt === false
                        ? "border-white/20 bg-white/[0.06]"
                        : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15"
                      }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
                      <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-white/70">No, not exempt</p>
                      <p className="text-xs text-white/30 mt-0.5">Standard tax applies</p>
                    </div>
                  </button>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => { setError(null); setStep("business_info"); }}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-white/70 border border-white/[0.08] hover:bg-white/[0.04] transition-colors"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 4 (conditional): EXEMPTION CERTIFICATE ── */}
            {step === "tax_exemption" && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20">
                  <svg className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-emerald-300/80 leading-relaxed">
                    Enter details from your Consumer's Certificate of Exemption (Form DR-14 or state equivalent). Stored securely for tax compliance.
                  </p>
                </div>

                <div>
                  <label className={labelCls}>
                    Certificate Number * <span className="text-white/25 font-normal">(digits and dashes only)</span>
                  </label>
                  <input
                    value={form.exemptionCertificateNumber}
                    onChange={(e) => set("exemptionCertificateNumber", e.target.value.replace(/[^0-9-]/g, ""))}
                    placeholder="85-8012345678C-0"
                    className={inputCls}
                    autoFocus
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
                  <label className={labelCls}>
                    Exemption Category * <span className="text-white/25 font-normal">(letters and numbers)</span>
                  </label>
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
                    onClick={() => { setError(null); setStep("tax_exempt"); }}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-white/70 border border-white/[0.08] hover:bg-white/[0.04] transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => { setError(null); setStep("create_fleet"); }}
                    disabled={!exemptionReady()}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-captain-500 hover:bg-captain-400 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 5: CREATE FIRST FLEET ── */}
            {step === "create_fleet" && (
              <div className="space-y-5">
                <div>
                  <label className={labelCls}>Fleet Name *</label>
                  <input
                    value={form.fleetName}
                    onChange={(e) => set("fleetName", e.target.value)}
                    placeholder="Sunset Charter Fleet"
                    className={inputCls}
                    autoFocus
                  />
                </div>

                <div>
                  <label className={labelCls}>Fleet Type</label>
                  <div className="grid grid-cols-5 gap-2">
                    {FLEET_TYPES.map((ft) => (
                      <button
                        key={ft.value}
                        type="button"
                        onClick={() => set("fleetType", form.fleetType === ft.value ? "" : ft.value)}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all
                          ${form.fleetType === ft.value
                            ? "border-captain-500/50 bg-captain-500/15 text-captain-300"
                            : "border-white/[0.08] bg-white/[0.02] text-white/40 hover:border-white/15 hover:text-white/60 hover:bg-white/[0.04]"
                          }`}
                      >
                        <span className="text-base">{ft.icon}</span>
                        {ft.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Description <span className="text-white/20 font-normal">(optional)</span></label>
                  <textarea
                    value={form.fleetDescription}
                    onChange={(e) => set("fleetDescription", e.target.value)}
                    placeholder="Brief description of your fleet…"
                    rows={2}
                    className={inputCls + " resize-none"}
                  />
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setError(null);
                      setStep(form.taxExempt === true ? "tax_exemption" : "tax_exempt");
                    }}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-white/70 border border-white/[0.08] hover:bg-white/[0.04] transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleFinish}
                    disabled={!fleetReady() || loading}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold bg-captain-500 hover:bg-captain-400 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Setting up your account…
                      </span>
                    ) : "Launch Fleet Command Center"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          QR Captain · Fleet Manager Setup
        </p>
      </div>
    </div>
  );
}
