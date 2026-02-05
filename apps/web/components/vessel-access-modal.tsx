"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

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
  onViewHistory: () => void;
  onViewManifest: () => void;
}

export function VesselAccessModal({
  vessel,
  onClose,
  onStartWorkOrder,
  onViewHistory,
  onViewManifest,
}: VesselAccessModalProps) {
  const [requestMessage, setRequestMessage] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [showMessageInput, setShowMessageInput] = useState(false);

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md mx-4 rounded-2xl bg-white shadow-2xl p-8">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-captain-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  // Mechanic has access - show full options
  if (accessStatus?.status === "authorized") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-captain-600 to-captain-700 px-6 py-6 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-3xl">⚓</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">{vessel.name}</h2>
                  <p className="text-captain-100">
                    {vessel.year} {vessel.make} {vessel.model}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Access granted badge */}
          <div className="px-6 py-3 bg-green-50 border-b border-green-100">
            <div className="flex items-center gap-2 text-green-700">
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
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Type</p>
                <p className="font-semibold text-gray-900 capitalize">
                  {vessel.vesselType.replace("_", " ")}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Service Records</p>
                <p className="font-semibold text-gray-900">
                  {vessel.workOrderCount} {vessel.workOrderCount === 1 ? "record" : "records"}
                </p>
              </div>
            </div>

            {/* Owner Info */}
            {vessel.ownerName && (
              <div className="bg-captain-50 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-captain-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-captain-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-captain-600">Owner</p>
                  <p className="font-semibold text-gray-900">{vessel.ownerName}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <button
                onClick={onStartWorkOrder}
                className="w-full py-3.5 bg-captain-600 text-white rounded-xl font-semibold hover:bg-captain-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Start Work Order
              </button>
              
              <button
                onClick={onViewHistory}
                className="w-full py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                View Service History
              </button>

              <button
                onClick={onViewManifest}
                className="w-full py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                View Equipment Manifest
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Access request is pending
  if (accessStatus?.status === "pending") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-6 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Request Pending</h2>
                  <p className="text-amber-100">{vessel.name}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
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
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Waiting for Owner Approval
              </h3>
              <p className="text-gray-600 text-sm">
                Your access request has been sent to {vessel.ownerName || "the owner"}. 
                You'll be notified when they respond.
              </p>
            </div>

            {/* Vessel info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚓</span>
                <div>
                  <p className="font-semibold text-gray-900">{vessel.name}</p>
                  <p className="text-sm text-gray-500">
                    {vessel.year} {vessel.make} {vessel.model}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Access was denied
  if (accessStatus?.status === "denied") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-6 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Access Denied</h2>
                  <p className="text-red-100">{vessel.name}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
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
              <p className="text-gray-600">
                The owner has denied your access request.
              </p>
              {accessStatus.responseMessage && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Owner's message:</p>
                  <p className="text-gray-700 italic">"{accessStatus.responseMessage}"</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setShowMessageInput(true)}
                className="w-full py-3.5 bg-captain-600 text-white rounded-xl font-semibold hover:bg-captain-700 transition-colors"
              >
                Request Access Again
              </button>
              <button
                onClick={onClose}
                className="w-full py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No access - show request form
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-captain-600 to-captain-700 px-6 py-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-3xl">⚓</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">{vessel.name}</h2>
                <p className="text-captain-100">
                  {vessel.year} {vessel.make} {vessel.model}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Access required notice */}
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100">
          <div className="flex items-center gap-2 text-amber-700">
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
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Type</p>
              <p className="font-semibold text-gray-900 capitalize">
                {vessel.vesselType.replace("_", " ")}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Owner</p>
              <p className="font-semibold text-gray-900">
                {vessel.ownerName || "Unknown"}
              </p>
            </div>
          </div>

          {showMessageInput ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message to Owner (optional)
                </label>
                <textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Introduce yourself or explain why you need access..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20 resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowMessageInput(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestAccess}
                  disabled={isRequesting}
                  className="flex-1 py-3 bg-captain-600 text-white rounded-xl font-semibold hover:bg-captain-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {isRequesting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    "Send Request"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                You need permission from the owner to access this vessel's service records and create work orders.
              </p>

              <button
                onClick={() => setShowMessageInput(true)}
                className="w-full py-3.5 bg-captain-600 text-white rounded-xl font-semibold hover:bg-captain-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                Request Access
              </button>

              <button
                onClick={onClose}
                className="w-full py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VesselAccessModal;
