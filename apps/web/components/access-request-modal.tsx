"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface AccessRequestModalProps {
  requestId: Id<"accessRequests">;
  onClose: () => void;
}

export function AccessRequestModal({ requestId, onClose }: AccessRequestModalProps) {
  const [responseMessage, setResponseMessage] = useState("");
  const [isResponding, setIsResponding] = useState(false);
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [pendingAction, setPendingAction] = useState<"approve" | "deny" | null>(null);

  const pendingRequests = useQuery(api.accessRequests.getPendingRequestsForOwner);
  const respondToRequest = useMutation(api.accessRequests.respondToRequest);

  // Find the specific request
  const request = pendingRequests?.find((r) => r._id === requestId);

  if (pendingRequests === undefined) {
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

  if (!request) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md mx-4 rounded-2xl bg-white shadow-2xl p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Not Found</h3>
            <p className="text-gray-600 text-sm mb-4">
              This request may have already been processed.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleRespond = async (approved: boolean) => {
    if (showMessageInput && pendingAction) {
      setIsResponding(true);
      try {
        await respondToRequest({
          requestId,
          approved: pendingAction === "approve",
          message: responseMessage || undefined,
        });
        onClose();
      } catch (error) {
        console.error("Failed to respond to request:", error);
      } finally {
        setIsResponding(false);
      }
    } else {
      setPendingAction(approved ? "approve" : "deny");
      setShowMessageInput(true);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold">Access Request</h2>
                <p className="text-amber-100">Review and respond</p>
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
          {/* Mechanic info */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-captain-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-captain-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{request.mechanic?.name || "Unknown Mechanic"}</p>
                <p className="text-sm text-gray-500">{request.mechanic?.email}</p>
                {request.mechanic?.companyName && (
                  <p className="text-sm text-captain-600">{request.mechanic.companyName}</p>
                )}
              </div>
            </div>
            {request.mechanic?.licenseNumber && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">License Number</p>
                <p className="text-sm font-medium text-gray-900">{request.mechanic.licenseNumber}</p>
              </div>
            )}
          </div>

          {/* Vessel info */}
          <div className="bg-captain-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚓</span>
              <div>
                <p className="font-semibold text-gray-900">{request.vessel?.name}</p>
                <p className="text-sm text-gray-500">
                  {request.vessel?.year} {request.vessel?.make} {request.vessel?.model}
                </p>
              </div>
            </div>
          </div>

          {/* Request message */}
          {request.requestMessage && (
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs text-blue-600 font-medium mb-1">Message from mechanic:</p>
              <p className="text-gray-700 italic">"{request.requestMessage}"</p>
            </div>
          )}

          {/* Request time */}
          <p className="text-sm text-gray-500 text-center">
            Requested on {formatDate(request.requestedAt)}
          </p>

          {/* Response form */}
          {showMessageInput ? (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message to Mechanic (optional)
                </label>
                <textarea
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  placeholder={
                    pendingAction === "approve"
                      ? "Welcome! Feel free to reach out if you have any questions..."
                      : "Sorry, we're currently not accepting new service providers..."
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20 resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowMessageInput(false);
                    setPendingAction(null);
                    setResponseMessage("");
                  }}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => handleRespond(pendingAction === "approve")}
                  disabled={isResponding}
                  className={`flex-1 py-3 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                    pendingAction === "approve"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  } disabled:opacity-50`}
                >
                  {isResponding ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : pendingAction === "approve" ? (
                    "Confirm Approval"
                  ) : (
                    "Confirm Denial"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleRespond(false)}
                className="flex-1 py-3.5 bg-red-100 text-red-700 rounded-xl font-semibold hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Deny Access
              </button>
              <button
                onClick={() => handleRespond(true)}
                className="flex-1 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Approve Access
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Pending requests list component for the owner's dashboard
interface PendingAccessRequestsProps {
  onViewRequest: (requestId: Id<"accessRequests">) => void;
}

export function PendingAccessRequests({ onViewRequest }: PendingAccessRequestsProps) {
  const pendingRequests = useQuery(api.accessRequests.getPendingRequestsForOwner);

  if (pendingRequests === undefined) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-captain-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (pendingRequests.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <h3 className="font-semibold text-amber-800">
          {pendingRequests.length} Pending Access {pendingRequests.length === 1 ? "Request" : "Requests"}
        </h3>
      </div>
      
      <div className="space-y-2">
        {pendingRequests.map((request) => (
          <div
            key={request._id}
            className="bg-white rounded-lg p-3 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onViewRequest(request._id)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-captain-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-captain-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">{request.mechanic?.name || "Unknown"}</p>
                <p className="text-sm text-gray-500">
                  Requesting access to <span className="font-medium">{request.vessel?.name}</span>
                </p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AccessRequestModal;
