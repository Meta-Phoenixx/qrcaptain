"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { GlassModal } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";

interface WorkOrderFormProps {
  vesselId: Id<"vessels">;
  vesselName: string;
  onSuccess: (workOrderId: Id<"workOrders">) => void;
  onCancel: () => void;
}

export function WorkOrderForm({ vesselId, vesselName, onSuccess, onCancel }: WorkOrderFormProps) {
  const { mode } = useTheme();
  const [description, setDescription] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get vessel equipment for optional reference
  const equipment = useQuery(api.vesselEquipment.listByVessel, { vesselId });
  
  // Create work order mutation
  const createWorkOrder = useMutation(api.workOrders.createWorkOrder);
  const updateWorkOrder = useMutation(api.workOrders.updateWorkOrder);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      setError("Please describe the work to be performed");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createWorkOrder({
        vesselId,
        description: description.trim(),
      });

      // If diagnosis was provided, update the work order
      if (diagnosis.trim() && result.workOrderId) {
        await updateWorkOrder({
          workOrderId: result.workOrderId,
          diagnosis: diagnosis.trim(),
        });
      }

      onSuccess(result.workOrderId);
    } catch (err) {
      console.error("Failed to create work order:", err);
      setError(err instanceof Error ? err.message : "Failed to create work order");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group equipment by category
  const equipmentByCategory = equipment?.reduce((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, typeof equipment>);

  return (
    <GlassModal onClose={onCancel} className="max-w-lg max-h-[90vh]">
        {/* Header */}
        <div className={`sticky top-0 border-b px-6 py-4 rounded-t-xl z-10 ${mode === 'dark' ? "bg-[#1A1A23] border-white/10" : "bg-white border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Start Work Order</h2>
              <p className={`text-sm mt-0.5 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{vesselName}</p>
            </div>
            <button
              onClick={onCancel}
              className={`p-2 transition-colors ${mode === 'dark' ? "text-gray-400 hover:text-white" : "text-gray-400 hover:text-gray-600"}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error Message */}
          {error && (
            <div className={`p-3 rounded-lg text-sm ${mode === 'dark' ? "bg-red-900/20 border border-red-500/30 text-red-300" : "bg-red-50 border border-red-200 text-red-700"}`}>
              {error}
            </div>
          )}

          {/* Description */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${mode === 'dark' ? "text-gray-200" : "text-gray-700"}`}>
              What work needs to be done? <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue or work to be performed..."
              rows={4}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 resize-none ${
                mode === 'dark'
                  ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  : "bg-white border-gray-300 text-black placeholder-gray-400"
              }`}
              autoFocus
            />
            <p className={`mt-1 text-xs ${mode === 'dark' ? "text-gray-500" : "text-gray-500"}`}>
              Be specific about the problem or maintenance task
            </p>
          </div>

          {/* Initial Diagnosis */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${mode === 'dark' ? "text-gray-200" : "text-gray-700"}`}>
              Initial Diagnosis
              <span className={`font-normal ml-1 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>(optional)</span>
            </label>
            <textarea
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Your initial assessment of the problem..."
              rows={3}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 resize-none ${
                mode === 'dark'
                  ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  : "bg-white border-gray-300 text-black placeholder-gray-400"
              }`}
            />
          </div>

          {/* Equipment Reference (Optional) */}
          {equipment && equipment.length > 0 && (
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${mode === 'dark' ? "text-gray-200" : "text-gray-700"}`}>
                Related Equipment
                <span className={`font-normal ml-1 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>(optional)</span>
              </label>
              <select
                value={selectedEquipmentId}
                onChange={(e) => setSelectedEquipmentId(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 ${
                  mode === 'dark'
                    ? "bg-white/5 border-white/10 text-white"
                    : "bg-white border-gray-300 text-black"
                }`}
              >
                <option value="" className={mode === 'dark' ? "bg-[#1A1A23]" : ""}>Select equipment if applicable...</option>
                {equipmentByCategory && Object.entries(equipmentByCategory).map(([category, items]) => (
                  <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)} className={mode === 'dark' ? "bg-[#1A1A23]" : ""}>
                    {items?.map((item) => (
                      <option key={item._id} value={item._id} className={mode === 'dark' ? "bg-[#1A1A23]" : ""}>
                        {item.name} {item.manufacturer ? `(${item.manufacturer})` : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}

          {/* Quick Start Tips */}
          <div className={`rounded-lg p-4 ${mode === 'dark' ? "bg-blue-900/20" : "bg-blue-50"}`}>
            <h4 className={`text-sm font-medium mb-2 ${mode === 'dark' ? "text-blue-300" : "text-blue-900"}`}>Quick Start Tips</h4>
            <ul className={`text-sm space-y-1 ${mode === 'dark' ? "text-blue-200" : "text-blue-700"}`}>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Take "before" photos to document the current state
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Add parts as you use them to track costs
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Update work performed notes as you complete tasks
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className={`flex-1 px-4 py-2.5 border rounded-lg transition-colors font-medium ${
                mode === 'dark'
                  ? "border-white/10 text-gray-300 hover:bg-white/5"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !description.trim()}
              className={`flex-1 px-4 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2 ${
                mode === 'dark'
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-captain-600 hover:bg-captain-700 text-white"
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Start Work Order
                </>
              )}
            </button>
          </div>
        </form>
    </GlassModal>
  );
}
