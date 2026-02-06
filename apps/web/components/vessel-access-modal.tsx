"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { ManifestViewer } from "./manifest-viewer";
import { ServiceHistoryViewer } from "./service-history-viewer";
import { GlassModal, GlassButton } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";
import { Anchor } from "lucide-react";

interface VesselAccessModalProps {
  vessel: {
    _id: Id<"vessels">;
    name: string;
    make: string;
    model: string;
    year: number;
    vesselType: string;
    ownerName?: string;
    ownerEmail?: string;
    workOrderCount: number;
    qrCodeData: string;
  };
  onClose: () => void;
  onStartWorkOrder: () => void;
  // These are now handled internally - kept for backwards compatibility
  onViewHistory?: () => void;
  onViewManifest?: () => void;
}

export function VesselAccessModal({
  vessel,
  onClose,
  onStartWorkOrder,
}: VesselAccessModalProps) {
  const { mode } = useTheme();
  const [requestMessage, setRequestMessage] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [showManifest, setShowManifest] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Check current access status
  const accessStatus = useQuery(api.accessRequests.getMyRequestStatus, {
    vesselId: vessel._id,
  });

  const requestAccess = useMutation(api.accessRequests.requestAccess);

  const handleRequestAccess = async () => {
    setIsRequesting(true);
    try {
      await requestAccess({
        vesselId: vessel._id,
        message: requestMessage || undefined,
      });
      setShowMessageInput(false);
      setRequestMessage("");
    } catch (error) {
      console.error("Failed to request access:", error);
    } finally {
      setIsRequesting(false);
    }
  };

  // Loading state
  if (accessStatus === undefined) {
    return (
      <GlassModal onClose={onClose} className="max-w-md p-8">
        <div className="flex items-center justify-center">
          <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin ${mode === 'dark' ? "border-blue-400" : "border-captain-600"}`}></div>
        </div>
      </GlassModal>
    );
  }

  // Mechanic has access - show full options
  if (accessStatus?.status === "authorized") {
    return (
      <GlassModal onClose={onClose} className="max-w-md p-0 overflow-hidden">
        {/* Header with gradient */}
        <div className={`px-6 py-6 ${mode === 'dark' ? "bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border-b border-white/10" : "bg-gradient-to-r from-captain-600 to-captain-700 text-white"}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${mode === 'dark' ? "bg-white/10" : "bg-white/20"}`}>
                <Anchor className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${mode === 'dark' ? "text-white" : "text-white"}`}>{vessel.name}</h2>
                <p className={mode === 'dark' ? "text-gray-300" : "text-captain-100"}>
                  {vessel.year} {vessel.make} {vessel.model}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${mode === 'dark' ? "hover:bg-white/10 text-white" : "hover:bg-white/10"}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Access granted badge */}
        <div className={`px-6 py-3 border-b ${mode === 'dark' ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-green-50 border-green-100 text-green-700"}`}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">Access Granted</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Vessel Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`rounded-xl p-4 ${mode === 'dark' ? "bg-white/5" : "bg-gray-50"}`}>
              <p className={`text-xs mb-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Type</p>
              <p className={`font-semibold capitalize ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
                {vessel.vesselType.replace("_", " ")}
              </p>
            </div>
            <div className={`rounded-xl p-4 ${mode === 'dark' ? "bg-white/5" : "bg-gray-50"}`}>
              <p className={`text-xs mb-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Service Records</p>
              <p className={`font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
                {vessel.workOrderCount} {vessel.workOrderCount === 1 ? "record" : "records"}
              </p>
            </div>
          </div>

          {/* Owner Info */}
          {vessel.ownerName && (
            <div className={`rounded-xl p-4 flex items-center gap-3 ${mode === 'dark' ? "bg-blue-900/20" : "bg-captain-50"}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-blue-500/20" : "bg-captain-100"}`}>
                <svg className={`w-5 h-5 ${mode === 'dark' ? "text-blue-400" : "text-captain-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className={`text-xs ${mode === 'dark' ? "text-blue-400" : "text-captain-600"}`}>Owner</p>
                <p className={`font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{vessel.ownerName}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <GlassButton
              variant="primary"
              onClick={onStartWorkOrder}
              className="w-full justify-center py-3.5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Start Work Order
            </GlassButton>
            
            <GlassButton
              variant="secondary"
              onClick={() => setShowHistory(true)}
              className="w-full justify-center py-3.5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View Service History
            </GlassButton>

            <GlassButton
              variant="secondary"
              onClick={() => setShowManifest(true)}
              className="w-full justify-center py-3.5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              View Equipment Manifest
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    );
  }

  // Access request is pending
  if (accessStatus?.status === "pending") {
    return (
      <GlassModal onClose={onClose} className="max-w-md p-0 overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-6 ${mode === 'dark' ? "bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-b border-white/10" : "bg-gradient-to-r from-amber-500 to-amber-600 text-white"}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${mode === 'dark' ? "bg-white/10" : "bg-white/20"}`}>
                <svg className={`w-8 h-8 ${mode === 'dark' ? "text-amber-400" : "text-white"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className={`text-xl font-bold ${mode === 'dark' ? "text-white" : "text-white"}`}>Request Pending</h2>
                <p className={mode === 'dark' ? "text-amber-200" : "text-amber-100"}>{vessel.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${mode === 'dark' ? "hover:bg-white/10 text-white" : "hover:bg-white/10 text-white"}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-center py-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${mode === 'dark' ? "bg-amber-500/20" : "bg-amber-100"}`}>
              <svg className={`w-8 h-8 ${mode === 'dark' ? "text-amber-400" : "text-amber-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
              Waiting for Owner Approval
            </h3>
            <p className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>
              Your access request has been sent to {vessel.ownerName || "the owner"}. 
              You'll be notified when they respond.
            </p>
          </div>

          {/* Vessel info */}
          <div className={`rounded-xl p-4 ${mode === 'dark' ? "bg-white/5" : "bg-gray-50"}`}>
            <div className="flex items-center gap-3">
              <Anchor className={`w-6 h-6 ${mode === 'dark' ? "text-blue-400" : "text-captain-600"}`} />
              <div>
                <p className={`font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{vessel.name}</p>
                <p className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                  {vessel.year} {vessel.make} {vessel.model}
                </p>
              </div>
            </div>
          </div>

          <GlassButton
            variant="secondary"
            onClick={onClose}
            className="w-full justify-center py-3.5"
          >
            Close
          </GlassButton>
        </div>
      </GlassModal>
    );
  }

  // Access was denied
  if (accessStatus?.status === "denied") {
    return (
      <GlassModal onClose={onClose} className="max-w-md p-0 overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-6 ${mode === 'dark' ? "bg-gradient-to-r from-red-600/40 to-red-700/40 border-b border-white/10" : "bg-gradient-to-r from-red-500 to-red-600 text-white"}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${mode === 'dark' ? "bg-white/10" : "bg-white/20"}`}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h2 className={`text-xl font-bold ${mode === 'dark' ? "text-white" : "text-white"}`}>Access Denied</h2>
                <p className={mode === 'dark' ? "text-red-200" : "text-red-100"}>{vessel.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${mode === 'dark' ? "hover:bg-white/10 text-white" : "hover:bg-white/10 text-white"}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-center py-4">
            <p className={mode === 'dark' ? "text-gray-300" : "text-gray-600"}>
              The owner has denied your access request.
            </p>
            {accessStatus.responseMessage && (
              <div className={`mt-4 p-4 rounded-xl ${mode === 'dark' ? "bg-white/5" : "bg-gray-50"}`}>
                <p className={`text-sm mb-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Owner's message:</p>
                <p className={`italic ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>"{accessStatus.responseMessage}"</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <GlassButton
              variant="primary"
              onClick={() => setShowMessageInput(true)}
              className="w-full justify-center py-3.5"
            >
              Request Access Again
            </GlassButton>
            <GlassButton
              variant="secondary"
              onClick={onClose}
              className="w-full justify-center py-3.5"
            >
              Close
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    );
  }

  // No access - show request form
  return (
    <GlassModal onClose={onClose} className="max-w-md p-0 overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-6 ${mode === 'dark' ? "bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border-b border-white/10" : "bg-gradient-to-r from-captain-600 to-captain-700 text-white"}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${mode === 'dark' ? "bg-white/10" : "bg-white/20"}`}>
              <Anchor className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${mode === 'dark' ? "text-white" : "text-white"}`}>{vessel.name}</h2>
              <p className={mode === 'dark' ? "text-gray-300" : "text-captain-100"}>
                {vessel.year} {vessel.make} {vessel.model}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${mode === 'dark' ? "hover:bg-white/10 text-white" : "hover:bg-white/10 text-white"}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Access required notice */}
      <div className={`px-6 py-3 border-b ${mode === 'dark' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-amber-50 border-amber-100 text-amber-700"}`}>
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-sm font-medium">Access Required</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Vessel info */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`rounded-xl p-4 ${mode === 'dark' ? "bg-white/5" : "bg-gray-50"}`}>
            <p className={`text-xs mb-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Type</p>
            <p className={`font-semibold capitalize ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
              {vessel.vesselType.replace("_", " ")}
            </p>
          </div>
          <div className={`rounded-xl p-4 ${mode === 'dark' ? "bg-white/5" : "bg-gray-50"}`}>
            <p className={`text-xs mb-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Owner</p>
            <p className={`font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
              {vessel.ownerName || "Unknown"}
            </p>
          </div>
        </div>

        {showMessageInput ? (
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                Message to Owner (optional)
              </label>
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="Introduce yourself or explain why you need access..."
                className={`w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-1 resize-none ${
                  mode === 'dark'
                    ? "bg-black/20 border-white/10 text-white placeholder-gray-400 focus:border-blue-500/50 focus:ring-blue-500/50"
                    : "border-gray-300 text-black placeholder:text-gray-400 focus:border-captain-500 focus:ring-captain-500/20"
                }`}
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <GlassButton
                variant="secondary"
                onClick={() => setShowMessageInput(false)}
                className="flex-1 justify-center py-3"
              >
                Cancel
              </GlassButton>
              <GlassButton
                variant="primary"
                onClick={handleRequestAccess}
                disabled={isRequesting}
                className="flex-1 justify-center py-3"
              >
                {isRequesting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  "Send Request"
                )}
              </GlassButton>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className={`text-sm text-center ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>
              You need permission from the owner to access this vessel's service records and create work orders.
            </p>

            <GlassButton
              variant="primary"
              onClick={() => setShowMessageInput(true)}
              className="w-full justify-center py-3.5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              Request Access
            </GlassButton>

            <GlassButton
              variant="secondary"
              onClick={onClose}
              className="w-full justify-center py-3.5"
            >
              Cancel
            </GlassButton>
          </div>
        )}
      </div>
    </GlassModal>
  );
}

export default VesselAccessModal;
