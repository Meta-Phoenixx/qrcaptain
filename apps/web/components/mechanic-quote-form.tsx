"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { GlassCard, GlassButton, GlassBadge, GlassInput, GlassSelect, GlassModal } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";
import { Anchor } from "lucide-react";

interface MechanicQuoteFormProps {
  workOrderId: Id<"workOrders">;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MechanicQuoteForm({ workOrderId, onClose, onSuccess }: MechanicQuoteFormProps) {
  const { mode } = useTheme();
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
      <GlassModal onClose={onClose} className="max-w-md">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className={`h-6 rounded w-3/4 ${mode === 'dark' ? "bg-white/10" : "bg-gray-200"}`}></div>
            <div className={`h-4 rounded w-1/2 ${mode === 'dark' ? "bg-white/10" : "bg-gray-200"}`}></div>
            <div className={`h-32 rounded ${mode === 'dark' ? "bg-white/10" : "bg-gray-200"}`}></div>
          </div>
        </div>
      </GlassModal>
    );
  }

  if (!workOrder) {
    return (
      <GlassModal onClose={onClose} className="max-w-md">
        <div className="p-6 text-center">
          <p className={mode === 'dark' ? "text-gray-300" : "text-gray-600"}>Work order not found</p>
          <GlassButton
            onClick={onClose}
            variant="primary"
            className="mt-4 w-full justify-center"
          >
            Close
          </GlassButton>
        </div>
      </GlassModal>
    );
  }

  return (
    <GlassModal onClose={onClose} className="max-w-lg max-h-[90vh]">
        {/* Header */}
        <div className={`sticky top-0 border-b px-6 py-4 rounded-t-xl z-10 ${mode === 'dark' ? "bg-[#1A1A23] border-white/10" : "bg-white border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Respond to Request</h2>
              <p className={`text-sm mt-0.5 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{workOrder.vessel?.name}</p>
            </div>
            <button
              onClick={onClose}
              className={`p-2 transition-colors ${mode === 'dark' ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-600"}`}
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
            <div className={`p-3 border rounded-lg text-sm ${mode === 'dark' ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-700"}`}>
              {error}
            </div>
          )}

          {/* Request Info */}
          <div className={`p-4 border rounded-lg ${mode === 'dark' ? "bg-orange-500/10 border-orange-500/20" : "bg-orange-50 border-orange-200"}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                workOrder.urgency === "urgent" 
                  ? mode === 'dark' ? "bg-red-500/20 text-red-300" : "bg-red-100 text-red-700"
                  : workOrder.urgency === "soon" 
                  ? mode === 'dark' ? "bg-yellow-500/20 text-yellow-300" : "bg-yellow-100 text-yellow-700"
                  : mode === 'dark' ? "bg-white/10 text-gray-300" : "bg-gray-100 text-gray-600"
              }`}>
                {workOrder.urgency === "urgent" ? "Urgent" : workOrder.urgency === "soon" ? "Soon" : "Routine"}
              </span>
              <span className={`text-xs ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                from {workOrder.vessel?.ownerName || "Owner"}
              </span>
            </div>
            <p className={`text-sm ${mode === 'dark' ? "text-gray-200" : "text-gray-700"}`}>{workOrder.description}</p>
          </div>

          {/* Vessel Info */}
          <div className={`flex items-center gap-4 p-3 rounded-lg ${mode === 'dark' ? "bg-white/5" : "bg-gray-50"}`}>
            <Anchor className={`w-6 h-6 ${mode === 'dark' ? "text-captain-400" : "text-captain-600"}`} />
            <div>
              <p className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{workOrder.vessel?.name}</p>
              <p className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                {workOrder.vessel?.year} {workOrder.vessel?.make} {workOrder.vessel?.model}
              </p>
            </div>
          </div>

          {showDeclineForm ? (
            /* Decline Form */
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                  Reason for declining (optional)
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Let the owner know why you can't take this job..."
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 placeholder-gray-400 resize-none ${mode === 'dark' ? "bg-white/5 border-white/10 text-white" : "border-gray-300 text-gray-900"}`}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeclineForm(false)}
                  className={`flex-1 px-4 py-2.5 border rounded-lg transition-colors font-medium ${mode === 'dark' ? "border-white/10 text-gray-300 hover:bg-white/5" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
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
              <h3 className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Submit Your Quote</h3>
              
              {/* Labor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                    Estimated Hours <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.25"
                    value={laborHours}
                    onChange={(e) => setLaborHours(e.target.value)}
                    placeholder="e.g., 4"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 ${mode === 'dark' ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "border-gray-300 text-gray-900"}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                    Labor Rate ($/hr) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={laborRate}
                    onChange={(e) => setLaborRate(e.target.value)}
                    placeholder="e.g., 95"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 ${mode === 'dark' ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "border-gray-300 text-gray-900"}`}
                  />
                </div>
              </div>

              {/* Parts */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                  Parts Estimate ($)
                  <span className={`font-normal ml-1 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>(optional)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={partsEstimate}
                  onChange={(e) => setPartsEstimate(e.target.value)}
                  placeholder="e.g., 150"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 ${mode === 'dark' ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "border-gray-300 text-gray-900"}`}
                />
              </div>

              {/* Estimated Completion Date */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                  Estimated Completion Date
                  <span className={`font-normal ml-1 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>(optional)</span>
                </label>
                <input
                  type="date"
                  value={estimatedCompletionDate}
                  onChange={(e) => setEstimatedCompletionDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 ${mode === 'dark' ? "bg-white/5 border-white/10 text-white" : "border-gray-300 text-gray-900 bg-white"}`}
                />
                <p className={`text-xs mt-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>When do you expect to complete the work?</p>
              </div>

              {/* Quote Expiration */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                  Quote Valid For
                </label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 ${mode === 'dark' ? "bg-white/5 border-white/10 text-white" : "border-gray-300 text-gray-900 bg-white"}`}
                >
                  <option value="3" className={mode === 'dark' ? "bg-gray-800 text-white" : ""}>3 days</option>
                  <option value="7" className={mode === 'dark' ? "bg-gray-800 text-white" : ""}>7 days</option>
                  <option value="14" className={mode === 'dark' ? "bg-gray-800 text-white" : ""}>14 days</option>
                  <option value="30" className={mode === 'dark' ? "bg-gray-800 text-white" : ""}>30 days</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                  Notes for Owner
                  <span className={`font-normal ml-1 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional details about the quote..."
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 placeholder-gray-400 resize-none ${mode === 'dark' ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "border-gray-300 text-gray-900"}`}
                />
              </div>

              {/* Total Preview */}
              {(laborHours && laborRate) && (
                <div className={`p-4 rounded-lg border ${mode === 'dark' ? "bg-captain-500/10 border-captain-500/20" : "bg-captain-50 border-captain-200"}`}>
                  <div className="flex justify-between items-center">
                    <span className={mode === 'dark' ? "text-gray-300" : "text-gray-700"}>Estimated Total</span>
                    <span className={`text-xl font-bold ${mode === 'dark' ? "text-captain-400" : "text-captain-700"}`}>
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
                  className={`px-4 py-2.5 border rounded-lg transition-colors font-medium ${mode === 'dark' ? "border-white/10 text-gray-300 hover:bg-white/5" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
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
    </GlassModal>
  );
}
