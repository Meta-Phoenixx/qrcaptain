"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { GlassCard, GlassButton, GlassBadge, GlassInput, GlassSelect } from "@/components/ui/glass";
import { useTheme } from "@/components/providers/theme-provider";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const a = api as any;

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; variant: "green" | "yellow" | "red" | "blue" }> = {
    in_service: { label: "In Service", variant: "green" },
    in_maintenance: { label: "In Maintenance", variant: "yellow" },
    out_of_service: { label: "Out of Service", variant: "red" },
    storage: { label: "Storage", variant: "blue" },
  };
  const entry = map[status ?? ""] ?? { label: status ?? "Unknown", variant: "blue" as const };
  return <GlassBadge color={entry.variant}>{entry.label}</GlassBadge>;
}

function WorkOrderStatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; variant: "green" | "yellow" | "red" | "blue" }> = {
    pending: { label: "Pending", variant: "yellow" },
    in_progress: { label: "In Progress", variant: "blue" },
    completed: { label: "Completed", variant: "green" },
    cancelled: { label: "Cancelled", variant: "red" },
    quote_requested: { label: "Quote Requested", variant: "yellow" },
    quote_submitted: { label: "Quote Submitted", variant: "blue" },
    quote_accepted: { label: "Quote Accepted", variant: "green" },
    quote_declined: { label: "Quote Declined", variant: "red" },
  };
  const entry = map[status ?? ""] ?? { label: status ?? "Unknown", variant: "blue" as const };
  return <GlassBadge color={entry.variant}>{entry.label}</GlassBadge>;
}

export default function VesselDetailPage() {
  const { vesselId: vesselIdParam } = useParams();
  const router = useRouter();
  const { mode } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editMake, setEditMake] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const vesselId = vesselIdParam as Id<"vessels">;

  const vessel = useQuery(a.vessels.getVessel, { vesselId });
  const workOrders = useQuery(a.workOrders.getVesselWorkOrders, { vesselId });
  const imageUrl = useQuery(a.storage.getVesselImageUrl, { vesselId });
  const updateVessel = useMutation(a.vessels.updateVessel);

  const isDark = mode === "dark";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
  const textMuted = isDark ? "text-gray-500" : "text-gray-400";
  const divider = isDark ? "border-white/10" : "border-gray-200";

  if (vessel === undefined || workOrders === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-captain-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (vessel === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className={`text-4xl`}>⚓</p>
        <h2 className={`text-2xl font-bold font-heading ${textPrimary}`}>Vessel Not Found</h2>
        <p className={textSecondary}>This vessel doesn&apos;t exist or you don&apos;t have access to it.</p>
        <GlassButton variant="secondary" onClick={() => router.back()}>Go Back</GlassButton>
      </div>
    );
  }

  function startEdit() {
    setEditName(vessel?.name ?? "");
    setEditMake(vessel?.make ?? "");
    setEditModel(vessel?.model ?? "");
    setEditYear(vessel?.year ? String(vessel.year) : "");
    setEditStatus(vessel?.status ?? "in_service");
    setEditNotes(vessel?.notes ?? "");
    setIsEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      await updateVessel({
        vesselId,
        name: editName,
        make: editMake || undefined,
        model: editModel || undefined,
        year: editYear ? Number(editYear) : undefined,
        status: editStatus || undefined,
        notes: editNotes || undefined,
      });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  }

  const specs = [
    { label: "Type", value: vessel.type },
    { label: "Registration #", value: vessel.registrationNumber },
    { label: "Hull ID", value: vessel.hullId },
    { label: "Length", value: vessel.length ? `${vessel.length} ft` : undefined },
    { label: "Engine", value: vessel.engineType },
    { label: "Fuel", value: vessel.fuelType },
  ].filter((s) => s.value);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className={`mt-1 flex items-center gap-1.5 text-sm font-medium transition-colors ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      <GlassCard className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-3">
                <GlassInput
                  label="Vessel Name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <div className="grid grid-cols-3 gap-3">
                  <GlassInput label="Make" value={editMake} onChange={(e) => setEditMake(e.target.value)} />
                  <GlassInput label="Model" value={editModel} onChange={(e) => setEditModel(e.target.value)} />
                  <GlassInput label="Year" type="number" value={editYear} onChange={(e) => setEditYear(e.target.value)} />
                </div>
                <GlassSelect
                  label="Status"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  options={[
                    { value: "in_service", label: "In Service" },
                    { value: "in_maintenance", label: "In Maintenance" },
                    { value: "out_of_service", label: "Out of Service" },
                    { value: "storage", label: "Storage" },
                  ]}
                />
                <GlassInput label="Notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                <div className="flex gap-3 pt-1">
                  <GlassButton variant="primary" onClick={saveEdit} disabled={saving}>
                    {saving ? "Saving…" : "Save Changes"}
                  </GlassButton>
                  <GlassButton variant="ghost" onClick={() => setIsEditing(false)}>Cancel</GlassButton>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className={`text-3xl font-bold font-heading ${textPrimary}`}>{vessel.name}</h1>
                  <StatusBadge status={vessel.status} />
                </div>
                <p className={`text-sm mt-1 ${textSecondary}`}>
                  {[vessel.make, vessel.model, vessel.year].filter(Boolean).join(" · ")}
                </p>
                {vessel.notes && (
                  <p className={`text-sm mt-3 ${textSecondary}`}>{vessel.notes}</p>
                )}
              </>
            )}
          </div>

          {!isEditing && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <GlassButton variant="primary" onClick={() => {}}>
                Request Service
              </GlassButton>
              <button
                onClick={startEdit}
                className={`p-2 rounded-xl border transition-all ${isDark ? "border-white/10 text-gray-400 hover:text-white hover:border-white/20" : "border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300"}`}
                title="Edit vessel"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3 1 1-3a4 4 0 01.828-1.414z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Vessel Photo */}
      <GlassCard className="overflow-hidden p-0">
        <div className={`px-5 py-3 border-b ${divider}`}>
          <h2 className={`text-sm font-semibold ${textPrimary}`}>Vessel Photo</h2>
        </div>
        <div className="relative">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={vessel.name}
              className="w-full h-64 object-cover"
            />
          ) : (
            <div className={`w-full h-64 flex flex-col items-center justify-center gap-3 ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
              <svg className={`w-12 h-12 ${textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className={`text-sm ${textMuted}`}>No photo uploaded</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Vessel Specs */}
      {specs.length > 0 && (
        <GlassCard className="p-0 overflow-hidden">
          <div className={`px-5 py-3 border-b ${divider}`}>
            <h2 className={`text-sm font-semibold ${textPrimary}`}>Vessel Specifications</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-px" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
            {specs.map((spec) => (
              <div key={spec.label} className={`p-4 ${isDark ? "bg-[#0d1627]" : "bg-white"}`}>
                <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${textMuted}`}>{spec.label}</p>
                <p className={`text-sm font-medium ${textPrimary}`}>{spec.value}</p>
              </div>
            ))}
            {vessel.notes && (
              <div className={`col-span-2 md:col-span-3 p-4 ${isDark ? "bg-[#0d1627]" : "bg-white"}`}>
                <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${textMuted}`}>Notes</p>
                <p className={`text-sm ${textSecondary}`}>{vessel.notes}</p>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* Work Orders */}
      <GlassCard className="p-0 overflow-hidden">
        <div className={`flex items-center justify-between px-5 py-3 border-b ${divider}`}>
          <h2 className={`text-sm font-semibold ${textPrimary}`}>Work Orders</h2>
          <span className={`text-xs ${textMuted}`}>{(workOrders ?? []).length} total</span>
        </div>
        {!workOrders || workOrders.length === 0 ? (
          <div className={`px-5 py-10 text-center text-sm ${textMuted}`}>No work orders yet.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
            {workOrders.map((wo: any) => (
              <div key={wo._id} className={`px-5 py-4 flex items-start justify-between gap-4 transition-colors ${isDark ? "hover:bg-white/[0.03]" : "hover:bg-gray-50/50"}`}>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${textPrimary}`}>{wo.description ?? "Service Request"}</p>
                  {wo.serviceType && (
                    <p className={`text-xs mt-0.5 ${textMuted}`}>{wo.serviceType}</p>
                  )}
                  {wo.createdAt && (
                    <p className={`text-xs mt-1 ${textMuted}`}>
                      {new Date(wo.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <WorkOrderStatusBadge status={wo.status} />
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* QR Code */}
      <GlassCard className="p-6">
        <h2 className={`text-sm font-semibold mb-3 ${textPrimary}`}>QR Code</h2>
        <div className="flex items-center gap-6">
          <div className={`w-24 h-24 rounded-xl border flex items-center justify-center ${isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"}`}>
            <svg className={`w-10 h-10 ${textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <div className="space-y-2">
            <p className={`text-sm ${textSecondary}`}>Scan this QR code to access the vessel&apos;s public service page.</p>
            {vessel.qrCodeId && (
              <p className={`text-xs font-mono ${textMuted}`}>ID: {vessel.qrCodeId}</p>
            )}
            <GlassButton variant="secondary" className="text-xs py-2 px-4">
              Download QR Code
            </GlassButton>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
