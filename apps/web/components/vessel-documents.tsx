"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

const a = api as any;

const CATEGORIES: { value: string; label: string }[] = [
  { value: "registration", label: "Registration" },
  { value: "insurance",    label: "Insurance"    },
  { value: "title",        label: "Title"        },
  { value: "survey",       label: "Survey"       },
  { value: "manual",       label: "Manual"       },
  { value: "warranty",     label: "Warranty"     },
  { value: "invoice",      label: "Invoice"      },
  { value: "other",        label: "Other"        },
];

const CATEGORY_COLORS: Record<string, string> = {
  registration: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  insurance:    "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  title:        "text-violet-400 bg-violet-500/10 border-violet-500/20",
  survey:       "text-amber-400 bg-amber-500/10 border-amber-500/20",
  manual:       "text-orange-400 bg-orange-500/10 border-orange-500/20",
  warranty:     "text-pink-400 bg-pink-500/10 border-pink-500/20",
  invoice:      "text-captain-400 bg-captain-500/10 border-captain-500/20",
  other:        "text-white/40 bg-white/[0.04] border-white/10",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ fileType }: { fileType: string }) {
  const isPdf = fileType === "application/pdf";
  const isImg = fileType.startsWith("image/");
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {isPdf ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      ) : isImg ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      )}
    </svg>
  );
}

export function VesselDocuments({ vesselId }: { vesselId: Id<"vessels"> }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingCategory, setPendingCategory] = useState("other");
  const [pendingNotes, setPendingNotes] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const docs = useQuery(a.vesselDocuments.listVesselDocuments, { vesselId }) ?? [];
  const generateUploadUrl = useMutation(a.storage.generateUploadUrl);
  const addDocument = useMutation(a.vesselDocuments.addVesselDocument);
  const deleteDocument = useMutation(a.vesselDocuments.deleteVesselDocument);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setPendingCategory("other");
    setPendingNotes("");
    setUploadError(null);
    setShowForm(true);
  }

  async function handleUpload() {
    if (!pendingFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": pendingFile.type },
        body: pendingFile,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = await res.json();
      await addDocument({
        vesselId,
        storageId,
        fileName: pendingFile.name,
        fileType: pendingFile.type || "application/octet-stream",
        fileSizeBytes: pendingFile.size,
        category: pendingCategory as any,
        notes: pendingNotes.trim() || undefined,
      });
      setPendingFile(null);
      setShowForm(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setUploadError(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function cancelUpload() {
    setPendingFile(null);
    setShowForm(false);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDelete(docId: string) {
    setDeletingId(docId);
    try {
      await deleteDocument({ documentId: docId as Id<"vesselDocuments"> });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white">Documents</h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-captain-500/15 border border-captain-500/20 text-captain-300 text-xs font-medium hover:bg-captain-500/25 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Add Document
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.xls,.xlsx,.csv,.txt"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Upload form */}
      {showForm && pendingFile && (
        <div className="mb-4 rounded-xl border border-captain-500/20 bg-captain-500/[0.04] p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-captain-400">
              <FileIcon fileType={pendingFile.type} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{pendingFile.name}</p>
              <p className="text-xs text-white/40">{formatBytes(pendingFile.size)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">Category</label>
              <select
                value={pendingCategory}
                onChange={(e) => setPendingCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.10] text-white text-sm focus:outline-none focus:border-captain-500/50 transition-colors"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Notes (optional)</label>
              <input
                value={pendingNotes}
                onChange={(e) => setPendingNotes(e.target.value)}
                placeholder="e.g. Expires Jan 2026"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.10] text-white text-sm placeholder-white/20 focus:outline-none focus:border-captain-500/50 transition-colors"
              />
            </div>
          </div>
          {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 py-2 rounded-lg bg-captain-500 hover:bg-captain-400 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
            <button
              onClick={cancelUpload}
              disabled={uploading}
              className="px-4 py-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.04] text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Document list */}
      {docs.length === 0 && !showForm ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="py-8 rounded-xl border-2 border-dashed border-white/[0.06] hover:border-captain-500/30 hover:bg-white/[0.02] flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group"
        >
          <svg className="w-7 h-7 text-white/15 group-hover:text-captain-500/40 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-xs text-white/25 group-hover:text-white/40 transition-colors">Upload registration, insurance, title, and more</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc: any) => {
            const catColor = CATEGORY_COLORS[doc.category] ?? CATEGORY_COLORS.other;
            const catLabel = CATEGORIES.find((c) => c.value === doc.category)?.label ?? doc.category;
            return (
              <div
                key={doc._id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors group"
              >
                <span className="text-white/40">
                  <FileIcon fileType={doc.fileType} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{doc.fileName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${catColor}`}>{catLabel}</span>
                    {doc.notes && <span className="text-xs text-white/30 truncate">{doc.notes}</span>}
                    {doc.fileSizeBytes && <span className="text-xs text-white/20">{formatBytes(doc.fileSizeBytes)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
                      title="Open"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(doc._id)}
                    disabled={deletingId === doc._id}
                    className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
