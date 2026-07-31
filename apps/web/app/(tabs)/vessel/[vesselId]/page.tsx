"use client";

import { useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { QRCodeSVG } from "qrcode.react";
import { Camera, Pencil, X } from "lucide-react";
import { FleetSideNav } from "@/components/fleet-side-nav";
import { EquipmentManifest } from "@/components/equipment-manifest";
import { ImageCropper } from "@/components/image-cropper";
import { WorkOrderEditor } from "@/components/work-order-editor";
import { WorkOrderRequestForm } from "@/components/work-order-request-form";
import { GlassButton, GlassBadge, GlassInput, GlassSelect } from "@/components/ui/glass";

const a = api as any;

// ─── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; color: "green" | "yellow" | "red" | "blue" }> = {
    in_service:     { label: "In Service",      color: "green"  },
    in_maintenance: { label: "In Maintenance",  color: "yellow" },
    out_of_service: { label: "Out of Service",  color: "red"    },
    storage:        { label: "Storage",         color: "blue"   },
  };
  const e = map[status ?? ""] ?? { label: status ?? "Unknown", color: "blue" as const };
  return <GlassBadge color={e.color}>{e.label}</GlassBadge>;
}

// ─── Inline QR code with download / print ────────────────────────────────────

function VesselQRCode({ qrCodeData, vesselName }: { qrCodeData: string; vesselName: string }) {
  const qrRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(() => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const qrSize = 256;
    const padding = 32;
    const labelHeight = 60;
    canvas.width = qrSize + padding * 2;
    canvas.height = qrSize + padding * 2 + labelHeight;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, padding, padding, qrSize, qrSize);
      ctx.fillStyle = "#1f2937";
      ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(vesselName, canvas.width / 2, qrSize + padding + 30);
      ctx.fillStyle = "#6b7280";
      ctx.font = "12px monospace";
      ctx.fillText(qrCodeData, canvas.width / 2, qrSize + padding + 50);
      const link = document.createElement("a");
      link.download = `${vesselName.replace(/[^a-z0-9]/gi, "_")}_QR.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [qrCodeData, vesselName]);

  const handlePrint = useCallback(() => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>QR Code - ${vesselName}</title>
      <style>
        body{font-family:system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box;}
        .qr-container{text-align:center;padding:40px;border:2px solid #e5e7eb;border-radius:16px;background:white;}
        .qr-code{width:200px;height:200px;margin-bottom:20px;}
        h2{margin:0 0 8px 0;color:#1f2937;font-size:24px;}
        .code-id{font-family:monospace;color:#6b7280;font-size:14px;}
        .instructions{margin-top:16px;font-size:12px;color:#9ca3af;}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.qr-container{border:1px solid #000;}}
      </style></head><body><div class="qr-container">
        <div class="qr-code">${qrRef.current?.innerHTML || ""}</div>
        <h2>${vesselName}</h2>
        <div class="code-id">${qrCodeData}</div>
        <div class="instructions">Scan with QR Captain app to access vessel service history</div>
      </div></body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 250);
  }, [qrCodeData, vesselName]);

  return (
    <div className="mb-6 p-4 bg-gradient-to-br from-captain-50 to-captain-100 rounded-xl">
      <div className="text-center">
        <div ref={qrRef} className="inline-block p-4 bg-white rounded-xl shadow-sm mb-3">
          <QRCodeSVG value={qrCodeData} size={160} level="H" includeMargin={false} bgColor="#ffffff" fgColor="#0c4a6e" />
        </div>
        <p className="text-sm text-gray-600 mb-1">Scan this QR code to access vessel history</p>
        <p className="text-xs text-captain-600 font-mono mb-4">{qrCodeData}</p>
        <div className="flex gap-2 justify-center">
          <button onClick={handleDownload} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-captain-700 bg-white border border-captain-200 rounded-lg hover:bg-captain-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-captain-700 bg-white border border-captain-200 rounded-lg hover:bg-captain-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function VesselDetailPage() {
  const { vesselId: vesselIdParam } = useParams();
  const router = useRouter();
  const vesselId = vesselIdParam as Id<"vessels">;

  const fleetList = useQuery(a.fleetDashboard.listAllFleetsDashboard) ?? [];
  const [selectedFleetId, setSelectedFleetId] = useState<Id<"fleets"> | null>(null);
  const vessel = useQuery(a.vessels.getVessel, { vesselId });
  const workOrders = useQuery(a.workOrders.getVesselWorkOrders, { vesselId });
  const vesselImageUrl = useQuery(a.storage.getVesselImageUrl, { vesselId });

  const generateUploadUrl = useMutation(a.storage.generateUploadUrl);
  const saveVesselImage = useMutation(a.storage.saveVesselImage);
  const updateVessel = useMutation(a.vessels.updateVessel);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editMake, setEditMake] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editVesselType, setEditVesselType] = useState("");
  const [editRegistrationNumber, setEditRegistrationNumber] = useState("");
  const [editHullId, setEditHullId] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<Id<"workOrders"> | null>(null);
  const [showWorkOrderRequest, setShowWorkOrderRequest] = useState(false);

  // ── Edit helpers ────────────────────────────────────────────────────────

  function startEditing() {
    if (!vessel) return;
    setEditName(vessel.name);
    setEditMake(vessel.make);
    setEditModel(vessel.model);
    setEditYear(String(vessel.year));
    setEditVesselType(vessel.vesselType);
    setEditRegistrationNumber(vessel.registrationNumber || "");
    setEditHullId(vessel.hullId || "");
    setEditNotes(vessel.notes || "");
    setEditError(null);
    setIsEditing(true);
  }

  async function saveEdits() {
    if (!editName.trim() || !editMake.trim() || !editModel.trim() || !editYear.trim()) {
      setEditError("Name, make, model, and year are required.");
      return;
    }
    const yearNum = parseInt(editYear);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1) {
      setEditError("Please enter a valid year.");
      return;
    }
    setIsSaving(true);
    setEditError(null);
    try {
      await updateVessel({
        vesselId,
        name: editName.trim(),
        make: editMake.trim(),
        model: editModel.trim(),
        year: yearNum,
        vesselType: editVesselType,
        registrationNumber: editRegistrationNumber.trim() || undefined,
        hullId: editHullId.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });
      setIsEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update vessel");
    } finally {
      setIsSaving(false);
    }
  }

  // ── Photo upload helpers ────────────────────────────────────────────────

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageToCrop(url);
  }

  async function handleCroppedImage(blob: Blob) {
    setImageToCrop(null);
    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      const { storageId } = await result.json();
      await saveVesselImage({ vesselId, storageId });
    } catch (err) {
      console.error("Photo upload failed:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleCropCancel() {
    if (imageToCrop) URL.revokeObjectURL(imageToCrop);
    setImageToCrop(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Loading / not found states ──────────────────────────────────────────

  if (vessel === undefined || workOrders === undefined) {
    return (
      <div className="flex min-h-screen bg-[#0f1929]">
        <FleetSideNav fleets={fleetList} selectedFleetId={selectedFleetId} onFleetChange={setSelectedFleetId} />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-captain-400 animate-spin" />
        </main>
      </div>
    );
  }

  if (!vessel) {
    return (
      <div className="flex min-h-screen bg-[#0f1929]">
        <FleetSideNav fleets={fleetList} selectedFleetId={selectedFleetId} onFleetChange={setSelectedFleetId} />
        <main className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <p className="text-4xl">⚓</p>
          <h2 className="text-2xl font-bold font-heading text-white">Vessel Not Found</h2>
          <p className="text-white/40 text-sm">This vessel doesn&apos;t exist or you don&apos;t have access to it.</p>
          <button onClick={() => router.back()} className="text-captain-400 text-sm hover:text-captain-300 transition-colors">Go Back</button>
        </main>
      </div>
    );
  }

  const inProgressOrders = (workOrders ?? []).filter((wo: any) => wo.status === "in_progress");
  const historyOrders = (workOrders ?? []).filter((wo: any) => wo.status !== "in_progress");

  return (
    <>
      <div className="flex min-h-screen bg-[#0f1929]">
        <FleetSideNav fleets={fleetList} selectedFleetId={selectedFleetId} onFleetChange={setSelectedFleetId} />

        <main className="flex-1 min-w-0 overflow-x-hidden">
          {/* Page header */}
          <div className="px-6 pt-8 pb-6 border-b border-white/[0.06]">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Vessels
            </button>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold font-heading text-white tracking-tight">{vessel.name}</h1>
                  <StatusBadge status={vessel.status} />
                </div>
                <p className="text-sm text-white/40 mt-0.5">{vessel.make} {vessel.model} · {vessel.year}</p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <button
                    onClick={startEditing}
                    title="Edit vessel info"
                    className="p-2 rounded-xl border border-white/[0.08] text-white/40 hover:text-white hover:border-white/20 transition-all"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                <GlassButton
                  onClick={() => setShowWorkOrderRequest(true)}
                  variant="primary"
                  className="text-sm py-1.5 px-4 h-auto"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Request Service
                </GlassButton>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 max-w-3xl space-y-6">

            {/* ── Vessel Photo ─────────────────────────────────────────── */}
            <section>
              <h2 className="text-sm font-semibold text-white mb-3">Vessel Photo</h2>
              <div className="relative">
                {vesselImageUrl ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={vesselImageUrl} alt={vessel.name} className="w-full h-56 object-cover" />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="absolute bottom-3 right-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-white shadow-sm transition-colors"
                    >
                      {isUploading ? "Uploading…" : "Change Photo"}
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    className="w-full h-56 rounded-xl border-2 border-dashed border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-captain-500/40 flex flex-col items-center justify-center cursor-pointer transition-all"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-8 h-8 rounded-full border-4 border-white/10 border-t-captain-400 animate-spin mb-2" />
                        <p className="text-sm text-white/40">Uploading…</p>
                      </>
                    ) : (
                      <>
                        <Camera className="w-10 h-10 mb-2 text-white/20" />
                        <p className="text-sm text-white/40">Click to upload a photo of your vessel</p>
                        <p className="text-xs text-white/20 mt-1">JPG, PNG up to 10MB</p>
                      </>
                    )}
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              </div>
            </section>

            {/* ── QR Code ──────────────────────────────────────────────── */}
            {vessel.qrCodeData && (
              <VesselQRCode qrCodeData={vessel.qrCodeData} vesselName={vessel.name} />
            )}

            {/* ── Vessel Details ─── view or edit ──────────────────────── */}
            {isEditing ? (
              <section className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-5 space-y-3">
                <h2 className="text-sm font-semibold text-white mb-1">Edit Vessel Info</h2>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">Vessel Name *</label>
                  <GlassInput value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g., Sea Breeze" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1">Make *</label>
                    <GlassInput value={editMake} onChange={(e) => setEditMake(e.target.value)} placeholder="e.g., Boston Whaler" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1">Model *</label>
                    <GlassInput value={editModel} onChange={(e) => setEditModel(e.target.value)} placeholder="e.g., Outrage 330" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1">Year *</label>
                    <GlassInput value={editYear} onChange={(e) => setEditYear(e.target.value)} type="number" placeholder="2023" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1">Vessel Type *</label>
                    <GlassSelect value={editVesselType} onChange={(e) => setEditVesselType(e.target.value)}>
                      <option value="powerboat">Powerboat</option>
                      <option value="sailboat">Sailboat</option>
                      <option value="yacht">Yacht</option>
                      <option value="fishing">Fishing Boat</option>
                      <option value="pontoon">Pontoon</option>
                      <option value="jet_ski">Jet Ski / PWC</option>
                      <option value="center_console">Center Console</option>
                      <option value="cabin_cruiser">Cabin Cruiser</option>
                      <option value="other">Other</option>
                    </GlassSelect>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1">Registration Number</label>
                    <GlassInput value={editRegistrationNumber} onChange={(e) => setEditRegistrationNumber(e.target.value)} placeholder="FL 1234 AB" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1">Hull ID (HIN)</label>
                    <GlassInput value={editHullId} onChange={(e) => setEditHullId(e.target.value)} placeholder="ABC12345D678" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg px-4 py-2 bg-black/20 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:border-captain-500/50 focus:ring-captain-500/30 transition-all"
                    placeholder="Any additional information about your vessel…"
                  />
                </div>
                {editError && (
                  <div className="rounded-lg p-3 text-sm bg-red-500/10 text-red-300 border border-red-500/20">{editError}</div>
                )}
                <div className="flex gap-3 pt-1">
                  <GlassButton variant="secondary" onClick={() => { setIsEditing(false); setEditError(null); }} disabled={isSaving} className="flex-1">Cancel</GlassButton>
                  <GlassButton variant="primary" onClick={saveEdits} disabled={isSaving} className="flex-1">{isSaving ? "Saving…" : "Save Changes"}</GlassButton>
                </div>
              </section>
            ) : (
              <section>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-xs text-white/30 uppercase tracking-wider">Type</span>
                    <p className="text-sm font-medium text-white capitalize mt-0.5">{vessel.vesselType?.replace("_", " ")}</p>
                  </div>
                  {vessel.registrationNumber && (
                    <div>
                      <span className="text-xs text-white/30 uppercase tracking-wider">Registration</span>
                      <p className="text-sm font-medium text-white mt-0.5">{vessel.registrationNumber}</p>
                    </div>
                  )}
                  {vessel.hullId && (
                    <div>
                      <span className="text-xs text-white/30 uppercase tracking-wider">Hull ID</span>
                      <p className="text-sm font-medium text-white mt-0.5">{vessel.hullId}</p>
                    </div>
                  )}
                </div>
                {vessel.notes && (
                  <p className="text-sm text-white/50">{vessel.notes}</p>
                )}
              </section>
            )}

            {/* ── Equipment Manifest ───────────────────────────────────── */}
            <EquipmentManifest vesselId={vesselId} />

            {/* ── Work In Progress ─────────────────────────────────────── */}
            {inProgressOrders.length > 0 && (
              <section className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">Work In Progress</span>
                </div>
                <div className="space-y-1.5">
                  {inProgressOrders.map((order: any) => (
                    <button
                      key={order._id}
                      onClick={() => setSelectedWorkOrderId(order._id)}
                      className="w-full flex items-center justify-between gap-2 text-xs p-2 -mx-2 rounded-md hover:bg-amber-500/20 transition-colors group text-left"
                    >
                      <span className="truncate flex-1 text-white/70">{order.description}</span>
                      <span className="flex-shrink-0 text-amber-300">{order.mechanicName || "Unknown"}</span>
                      <span className="flex-shrink-0 text-white/30">{new Date(order.startedAt).toLocaleDateString()}</span>
                      <svg className="w-4 h-4 flex-shrink-0 text-amber-400/50 group-hover:text-amber-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* ── Service History ──────────────────────────────────────── */}
            <section>
              <h2 className="text-sm font-semibold text-white mb-3">Service History</h2>
              {historyOrders.length === 0 ? (
                <div className="py-6 text-center text-sm text-white/25 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  No completed service records yet
                </div>
              ) : (
                <div className="divide-y divide-white/[0.06]">
                  {historyOrders.map((order: any) => (
                    <div key={order._id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${order.status === "completed" ? "bg-emerald-500" : "bg-white/20"}`} />
                        <span className="text-sm text-white/70 truncate">{order.description}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 text-xs text-white/30 ml-3">
                        {order.mechanicName && <span>{order.mechanicName}</span>}
                        <span>·</span>
                        <span>{new Date(order.startedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        </main>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}

      {imageToCrop && (
        <ImageCropper
          imageSrc={imageToCrop}
          onCropComplete={handleCroppedImage}
          onCancel={handleCropCancel}
          aspectRatio={16 / 9}
        />
      )}

      {selectedWorkOrderId && (
        <WorkOrderEditor
          workOrderId={selectedWorkOrderId}
          onClose={() => setSelectedWorkOrderId(null)}
        />
      )}

      {showWorkOrderRequest && (
        <WorkOrderRequestForm
          preSelectedVesselId={vesselId}
          onCancel={() => setShowWorkOrderRequest(false)}
          onSuccess={() => setShowWorkOrderRequest(false)}
        />
      )}
    </>
  );
}
