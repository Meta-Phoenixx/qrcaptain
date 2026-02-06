"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { GlassModal, GlassButton } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";
import { Anchor } from "lucide-react";

interface AccessRequestModalProps {
  requestId: Id<"accessRequests">;
  onClose: () => void;
}

export function AccessRequestModal({ requestId, onClose }: AccessRequestModalProps) {
  const { mode } = useTheme();
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
      <GlassModal onClose={onClose} className="max-w-md p-8">
        <div className="flex items-center justify-center">
          <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin ${mode === 'dark' ? "border-blue-400" : "border-captain-600"}`}></div>
        </div>
      </GlassModal>
    );
  }

  if (!request) {
    return (
      <GlassModal onClose={onClose} className="max-w-md p-8">
        <div className="text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${mode === 'dark' ? "bg-white/10" : "bg-gray-100"}`}>
            <svg className={`w-8 h-8 ${mode === 'dark' ? "text-gray-400" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className={`text-lg font-semibold mb-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Request Not Found</h3>
          <p className={`text-sm mb-4 ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>
            This request may have already been processed.
          </p>
          <GlassButton
            variant="secondary"
            onClick={onClose}
            className="w-full justify-center"
          >
            Close
          </GlassButton>
        </div>
      </GlassModal>
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
    <GlassModal onClose={onClose} className="max-w-lg p-0 overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-6 ${mode === 'dark' ? "bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-b border-white/10" : "bg-gradient-to-r from-amber-500 to-amber-600 text-white"}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${mode === 'dark' ? "bg-white/10" : "bg-white/20"}`}>
              <svg className={`w-8 h-8 ${mode === 'dark' ? "text-amber-400" : "text-white"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className={`text-xl font-bold ${mode === 'dark' ? "text-white" : "text-white"}`}>Access Request</h2>
              <p className={mode === 'dark' ? "text-amber-200" : "text-amber-100"}>Review and respond</p>
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
        {/* Mechanic info */}
        <div className={`rounded-xl p-4 ${mode === 'dark' ? "bg-white/5" : "bg-gray-50"}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-blue-500/20" : "bg-captain-100"}`}>
              <svg className={`w-6 h-6 ${mode === 'dark' ? "text-blue-400" : "text-captain-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className={`font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{request.mechanic?.name || "Unknown Mechanic"}</p>
              <p className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{request.mechanic?.email}</p>
              {request.mechanic?.companyName && (
                <p className={`text-sm ${mode === 'dark' ? "text-blue-400" : "text-captain-600"}`}>{request.mechanic.companyName}</p>
              )}
            </div>
          </div>
          {request.mechanic?.licenseNumber && (
            <div className={`mt-3 pt-3 border-t ${mode === 'dark' ? "border-white/10" : "border-gray-200"}`}>
              <p className={`text-xs ${mode === 'dark' ? "text-gray-500" : "text-gray-500"}`}>License Number</p>
              <p className={`text-sm font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{request.mechanic.licenseNumber}</p>
            </div>
          )}
        </div>

        {/* Vessel info */}
        <div className={`rounded-xl p-4 ${mode === 'dark' ? "bg-blue-900/20" : "bg-captain-50"}`}>
          <div className="flex items-center gap-3">
            <Anchor className={`w-6 h-6 ${mode === 'dark' ? "text-blue-400" : "text-captain-600"}`} />
            <div>
              <p className={`font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{request.vessel?.name}</p>
              <p className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                {request.vessel?.year} {request.vessel?.make} {request.vessel?.model}
              </p>
            </div>
          </div>
        </div>

        {/* Request message */}
        {request.requestMessage && (
          <div className={`rounded-xl p-4 ${mode === 'dark' ? "bg-white/5" : "bg-blue-50"}`}>
            <p className={`text-xs font-medium mb-1 ${mode === 'dark' ? "text-blue-400" : "text-blue-600"}`}>Message from mechanic:</p>
            <p className={`italic ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>"{request.requestMessage}"</p>
          </div>
        )}

        {/* Request time */}
        <p className={`text-sm text-center ${mode === 'dark' ? "text-gray-500" : "text-gray-500"}`}>
          Requested on {formatDate(request.requestedAt)}
        </p>

        {/* Response form */}
        {showMessageInput ? (
          <div className="space-y-4 pt-2">
            <div>
              <label className={`block text-sm font-medium mb-2 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
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
                onClick={() => {
                  setShowMessageInput(false);
                  setPendingAction(null);
                  setResponseMessage("");
                }}
                className="flex-1 justify-center py-3"
              >
                Back
              </GlassButton>
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
              className={`flex-1 py-3.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                mode === 'dark' 
                  ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" 
                  : "bg-red-100 text-red-700 hover:bg-red-200"
              }`}
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
    </GlassModal>
  );
}

// Pending requests list component for the owner's dashboard
interface PendingAccessRequestsProps {
  onViewRequest: (requestId: Id<"accessRequests">) => void;
}

export function PendingAccessRequests({ onViewRequest }: PendingAccessRequestsProps) {
  const { mode } = useTheme();
  const pendingRequests = useQuery(api.accessRequests.getPendingRequestsForOwner);

  if (pendingRequests === undefined) {
    return (
      <div className={`rounded-xl shadow-sm p-6 ${mode === 'dark' ? "bg-white/5" : "bg-white"}`}>
        <div className="flex items-center justify-center">
          <div className={`w-6 h-6 border-2 border-t-transparent rounded-full animate-spin ${mode === 'dark' ? "border-blue-400" : "border-captain-600"}`}></div>
        </div>
      </div>
    );
  }

  if (pendingRequests.length === 0) {
    return null;
  }

  return (
    <div className={`border rounded-xl p-4 mb-6 ${mode === 'dark' ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-200"}`}>
      <div className="flex items-center gap-2 mb-3">
        <svg className={`w-5 h-5 ${mode === 'dark' ? "text-amber-400" : "text-amber-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <h3 className={`font-semibold ${mode === 'dark' ? "text-amber-200" : "text-amber-800"}`}>
          {pendingRequests.length} Pending Access {pendingRequests.length === 1 ? "Request" : "Requests"}
        </h3>
      </div>
      
      <div className="space-y-2">
        {pendingRequests.map((request) => (
          <div
            key={request._id}
            className={`rounded-lg p-3 flex items-center justify-between transition-shadow cursor-pointer ${
              mode === 'dark' 
                ? "bg-white/10 hover:bg-white/20 hover:shadow-lg" 
                : "bg-white hover:shadow-md"
            }`}
            onClick={() => onViewRequest(request._id)}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-blue-500/20" : "bg-captain-100"}`}>
                <svg className={`w-5 h-5 ${mode === 'dark' ? "text-blue-400" : "text-captain-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{request.mechanic?.name || "Unknown"}</p>
                <p className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                  Requesting access to <span className="font-medium">{request.vessel?.name}</span>
                </p>
              </div>
            </div>
            <svg className={`w-5 h-5 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AccessRequestModal;
