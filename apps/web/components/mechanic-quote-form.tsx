"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface MechanicQuoteFormProps {
  workOrderId: Id<"workOrders">;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MechanicQuoteForm({ workOrderId, onClose, onSuccess }: MechanicQuoteFormProps) {
  const [laborHours, setLaborHours] = useState("");
  const [laborRate, setLaborRate] = useState("");
  const [partsEstimate, setPartsEstimate] = useState("");
  const [notes, setNotes] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch work order details
  const workOrder = useQuery(api.workOrders.getWorkOrder, { workOrderId });
  
  // Mutations
  const submitQuote = useMutation(api.workOrders.submitQuote);
  const declineRequest = useMutation(api.workOrders.declineWorkOrderRequest);

  const isLoading = workOrder === undefined;

  const calculateTotal = () => {
    const hours = parseFloat(laborHours) || 0;
    const rate = parseFloat(laborRate) || 0;
    const parts = parseFloat(partsEstimate) || 0;
    return (hours * rate) + parts;
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const hours = parseFloat(laborHours);
    const rate = parseFloat(laborRate);
    
    if (!hours || hours <= 0) {
      setError("Please enter estimated labor hours");
      return;
    }
    
    if (!rate || rate <= 0) {
      setError("Please enter your labor rate");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Convert date string to timestamp if provided
      const completionTimestamp = estimatedCompletionDate 
        ? new Date(estimatedCompletionDate).getTime() 
        : undefined;

      await submitQuote({
        workOrderId,
        quotedLaborHours: hours,
        quotedLaborRate: rate,
        quotedPartsEstimate: parseFloat(partsEstimate) || undefined,
        quoteNotes: notes || undefined,
        quoteValidDays: parseInt(expiresInDays) || 7,
        estimatedCompletionDate: completionTimestamp,
      });
      
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error("Failed to submit quote:", err);
      setError(err instanceof Error ? err.message : "Failed to submit quote");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await declineRequest({ 
        workOrderId,
        reason: declineReason || undefined,
      });
      
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error("Failed to decline request:", err);
      setError(err instanceof Error ? err.message : "Failed to decline request");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center">
          <p className="text-gray-600">Work order not found</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-captain-600 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Respond to Request</h2>
              <p className="text-sm text-gray-500 mt-0.5">{workOrder.vessel?.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Request Info */}
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                workOrder.urgency === "urgent" 
                  ? "bg-red-100 text-red-700" 
                  : workOrder.urgency === "soon" 
                  ? "bg-yellow-100 text-yellow-700" 
                  : "bg-gray-100 text-gray-600"
              }`}>
                {workOrder.urgency === "urgent" ? "Urgent" : workOrder.urgency === "soon" ? "Soon" : "Routine"}
              </span>
              <span className="text-xs text-gray-500">
                from {workOrder.vessel?.ownerName || "Owner"}
              </span>
            </div>
            <p className="text-gray-700 text-sm">{workOrder.description}</p>
          </div>

          {/* Vessel Info */}
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <span className="text-2xl">⚓</span>
            <div>
              <p className="font-medium text-gray-900">{workOrder.vessel?.name}</p>
              <p className="text-sm text-gray-500">
                {workOrder.vessel?.year} {workOrder.vessel?.make} {workOrder.vessel?.model}
              </p>
            </div>
          </div>

          {showDeclineForm ? (
            /* Decline Form */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for declining (optional)
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Let the owner know why you can't take this job..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 text-black placeholder-gray-400 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeclineForm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleDecline}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
                >
                  {isSubmitting ? "Declining..." : "Confirm Decline"}
                </button>
              </div>
            </div>
          ) : (
            /* Quote Form */
            <form onSubmit={handleSubmitQuote} className="space-y-4">
              <h3 className="font-medium text-gray-900">Submit Your Quote</h3>
              
              {/* Labor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Hours <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.25"
                    value={laborHours}
                    onChange={(e) => setLaborHours(e.target.value)}
                    placeholder="e.g., 4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Labor Rate ($/hr) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={laborRate}
                    onChange={(e) => setLaborRate(e.target.value)}
                    placeholder="e.g., 95"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 text-black"
                  />
                </div>
              </div>

              {/* Parts */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parts Estimate ($)
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={partsEstimate}
                  onChange={(e) => setPartsEstimate(e.target.value)}
                  placeholder="e.g., 150"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 text-black"
                />
              </div>

              {/* Estimated Completion Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Completion Date
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <input
                  type="date"
                  value={estimatedCompletionDate}
                  onChange={(e) => setEstimatedCompletionDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 text-black bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">When do you expect to complete the work?</p>
              </div>

              {/* Quote Expiration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quote Valid For
                </label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 text-black bg-white"
                >
                  <option value="3">3 days</option>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes for Owner
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional details about the quote..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 text-black placeholder-gray-400 resize-none"
                />
              </div>

              {/* Total Preview */}
              {(laborHours && laborRate) && (
                <div className="p-4 bg-captain-50 rounded-lg border border-captain-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Estimated Total</span>
                    <span className="text-xl font-bold text-captain-700">
                      ${calculateTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeclineForm(true)}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Decline
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !laborHours || !laborRate}
                  className="flex-1 px-4 py-2.5 bg-captain-600 text-white rounded-lg hover:bg-captain-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Submit Quote
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
