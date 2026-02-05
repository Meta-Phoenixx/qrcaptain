"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface QuoteViewerProps {
  workOrderId: Id<"workOrders">;
  onClose: () => void;
}

export function QuoteViewer({ workOrderId, onClose }: QuoteViewerProps) {
  const workOrder = useQuery(api.workOrders.getWorkOrder, { workOrderId });
  const acceptQuote = useMutation(api.workOrders.acceptQuote);
  const declineQuote = useMutation(api.workOrders.declineQuote);
  
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [error, setError] = useState("");

  if (!workOrder) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-captain-600"></div>
          </div>
        </div>
      </div>
    );
  }

  const handleAccept = async () => {
    setIsAccepting(true);
    setError("");
    try {
      await acceptQuote({ workOrderId });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept quote");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    setError("");
    try {
      await declineQuote({ 
        workOrderId,
        reason: declineReason || undefined 
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decline quote");
    } finally {
      setIsDeclining(false);
    }
  };

  const laborTotal = (workOrder.quotedLaborHours || 0) * (workOrder.quotedLaborRate || 0);
  const partsTotal = workOrder.quotedPartsEstimate || 0;
  const grandTotal = workOrder.quotedTotalEstimate || laborTotal + partsTotal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Quote Details</h2>
            <p className="text-sm text-gray-500">Review and respond to this quote</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Work Order Info */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Work Order Request</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Vessel</span>
                <span className="font-medium text-gray-900">{workOrder.vessel?.name}</span>
              </div>
              {workOrder.vessel?.make && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Make/Model</span>
                  <span className="font-medium text-gray-900">
                    {workOrder.vessel.make} {workOrder.vessel.model}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Priority</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  workOrder.priority === "urgent" 
                    ? "bg-red-100 text-red-700"
                    : workOrder.priority === "high"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-green-100 text-green-700"
                }`}>
                  {workOrder.priority || "normal"}
                </span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-700">{workOrder.description}</p>
            </div>
          </div>

          {/* Mechanic Info */}
          <div className="flex items-center gap-4 bg-captain-50 rounded-xl p-4">
            <div className="w-12 h-12 bg-captain-200 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-captain-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">{workOrder.mechanic?.company || workOrder.mechanic?.name}</p>
              <p className="text-sm text-gray-500">Mechanic</p>
            </div>
          </div>

          {/* Quote Breakdown */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Quote Breakdown</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-gray-900">Labor</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({workOrder.quotedLaborHours || 0} hrs × ${workOrder.quotedLaborRate || 0}/hr)
                  </span>
                </div>
                <span className="font-medium text-gray-900">${laborTotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-900">Parts Estimate</span>
                <span className="font-medium text-gray-900">${partsTotal.toFixed(2)}</span>
              </div>
              
              <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                <span className="font-semibold text-gray-900">Total Estimate</span>
                <span className="text-xl font-bold text-green-600">${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Estimated Completion Date */}
          {workOrder.estimatedCompletionDate && (
            <div className="bg-captain-50 rounded-xl p-4 border border-captain-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-captain-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-captain-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estimated Completion</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(workOrder.estimatedCompletionDate).toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quote Notes */}
          {workOrder.quoteNotes && (
            <div className="bg-blue-50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Notes from Mechanic</h3>
              <p className="text-sm text-blue-800">{workOrder.quoteNotes}</p>
            </div>
          )}

          {/* Quote Valid Until */}
          {workOrder.quoteExpiresAt && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Quote valid until {new Date(workOrder.quoteExpiresAt).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Decline Confirmation */}
          {showDeclineConfirm ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-4">
              <h3 className="font-medium text-red-900">Decline this quote?</h3>
              <div>
                <label className="block text-sm font-medium text-red-800 mb-1">
                  Reason (optional)
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-500 focus:outline-none"
                  placeholder="Let the mechanic know why you're declining..."
                  rows={2}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeclineConfirm(false)}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={isDeclining}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDecline}
                  disabled={isDeclining}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                >
                  {isDeclining ? "Declining..." : "Confirm Decline"}
                </button>
              </div>
            </div>
          ) : (
            /* Action Buttons */
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeclineConfirm(true)}
                className="flex-1 px-4 py-3 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 font-medium"
                disabled={isAccepting}
              >
                Decline Quote
              </button>
              <button
                onClick={handleAccept}
                disabled={isAccepting}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {isAccepting ? "Accepting..." : "Accept & Start Work"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
