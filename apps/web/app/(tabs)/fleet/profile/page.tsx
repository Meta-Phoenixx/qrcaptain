"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { FleetSideNav } from "@/components/fleet-side-nav";

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">{label}</p>
      <p className="text-sm text-white/80">{value || <span className="text-white/20 italic">Not provided</span>}</p>
    </div>
  );
}

export default function FleetManagerProfilePage() {
  const router = useRouter();
  const a = api as any;
  const me = useQuery(a.users.currentUser);
  const fleetList = useQuery(a.fleetDashboard.listAllFleetsDashboard) ?? [];
  const logoUrl = useQuery(a.storage.getMechanicCompanyLogoUrl, {});
  const [selectedFleetId, setSelectedFleetId] = useState<Id<"fleets"> | null>(null);

  // Logo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const saveLogo = useMutation(a.storage.saveMechanicCompanyLogo);

  if (fleetList.length > 0 && !selectedFleetId) setSelectedFleetId(fleetList[0]._id);

  const handleLogoSelect = useCallback(async (file: File) => {
    const preview = URL.createObjectURL(file);
    setLogoPreview(preview);
    setLogoError(null);
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = await res.json();
      await saveLogo({ storageId: storageId as Id<"_storage"> });
    } catch (e: any) {
      setLogoPreview(null);
      setLogoError(e?.message ?? "Logo upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [generateUploadUrl, saveLogo]);

  const displayLogo = logoPreview ?? logoUrl;
  const fullName = me ? `${me.firstName ?? ""} ${me.lastName ?? ""}`.trim() : "";
  const address = me?.businessAddress
    ? `${me.businessAddress.street}, ${me.businessAddress.city}, ${me.businessAddress.state} ${me.businessAddress.zipCode}`
    : null;

  const expirationDate = me?.exemptionExpirationDate
    ? new Date(me.exemptionExpirationDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
  const effectiveDate = me?.exemptionEffectiveDate
    ? new Date(me.exemptionEffectiveDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

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
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/fleet")}
              className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Business Profile</h1>
              <p className="text-sm text-white/35 mt-0.5">Your company information and account settings</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-8 max-w-3xl space-y-6">

          {/* Company identity card */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06]">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest">Company Identity</h2>
            </div>
            <div className="px-6 py-6">
              <div className="flex items-start gap-6">
                {/* Logo */}
                <div className="flex-shrink-0">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-white/[0.12] bg-white/[0.03] hover:border-captain-500/40 hover:bg-captain-500/[0.04] transition-colors cursor-pointer group overflow-hidden"
                  >
                    {displayLogo ? (
                      <img src={displayLogo} alt="Company logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
                        <svg className="w-6 h-6 text-white/20 group-hover:text-captain-400/50 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-[10px] text-white/20 group-hover:text-white/40 transition-colors text-center leading-tight">Add Logo</p>
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-[#0f1929]/80 flex items-center justify-center">
                        <svg className="w-5 h-5 text-captain-400 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      </div>
                    )}
                    {displayLogo && !uploading && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-[10px] text-white font-medium">Change</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoSelect(f); }}
                  />
                  <p className="text-[10px] text-white/20 text-center mt-2">Click to update</p>
                  {logoError && <p className="text-[10px] text-red-400 text-center mt-1">{logoError}</p>}
                </div>

                {/* Core info */}
                <div className="flex-1 grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <InfoRow label="Official Business Name" value={me?.companyName} />
                  </div>
                  <InfoRow label="Contact Name" value={fullName || undefined} />
                  <InfoRow label="Phone" value={me?.phone} />
                  <div className="col-span-2">
                    <InfoRow label="Business Address" value={address} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Account details */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06]">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest">Account</h2>
            </div>
            <div className="px-6 py-6 grid grid-cols-2 gap-5">
              <InfoRow label="Email" value={me?.email} />
              <InfoRow label="Role" value="Fleet Manager" />
            </div>
          </div>

          {/* Tax exemption */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest">Tax Exemption</h2>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                me?.taxExempt
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                  : "bg-white/[0.05] text-white/30 border border-white/[0.08]"
              }`}>
                {me?.taxExempt ? "Exempt" : "Standard tax"}
              </span>
            </div>
            <div className="px-6 py-6">
              {me?.taxExempt ? (
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <InfoRow label="Certificate Number" value={me?.exemptionCertificateNumber} />
                  </div>
                  <InfoRow label="Effective Date" value={effectiveDate} />
                  <InfoRow label="Expiration Date" value={expirationDate} />
                  <div className="col-span-2">
                    <InfoRow label="Exemption Category" value={me?.exemptionCategory} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/30 italic">
                  Standard sales tax rates apply to your invoices. If your organization is tax-exempt, contact support to update your certificate.
                </p>
              )}
            </div>
          </div>

          {/* Update info note */}
          <p className="text-xs text-white/20 text-center pb-4">
            To update your business information, contact support at{" "}
            <span className="text-white/35">support@theqrcaptain.com</span>
          </p>
        </div>
      </main>
    </div>
  );
}
