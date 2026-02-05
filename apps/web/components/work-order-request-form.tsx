"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface WorkOrderRequestFormProps {
  onSuccess?: (workOrderId: Id<"workOrders">) => void;
  onCancel: () => void;
  preSelectedMechanicId?: Id<"users">;
  preSelectedVesselId?: Id<"vessels">;
}

export function WorkOrderRequestForm({
  onSuccess,
  onCancel,
  preSelectedMechanicId,
  preSelectedVesselId,
}: WorkOrderRequestFormProps) {
  const [selectedVesselId, setSelectedVesselId] = useState<string>(preSelectedVesselId || "");
  const [selectedMechanicId, setSelectedMechanicId] = useState<string>(preSelectedMechanicId || "");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<"routine" | "soon" | "urgent">("routine");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get owner's preferred mechanics
  const preferredMechanics = useQuery(api.preferredMechanics.getPreferredMechanics);
  
  // Get owner's vessels
  const vessels = useQuery(api.vessels.listMyVessels);

  // Get equipment for selected vessel
  const equipment = useQuery(
    api.vesselEquipment.listByVessel,
    selectedVesselId ? { vesselId: selectedVesselId as Id<"vessels"> } : "skip"
  );

  // Request work order mutation
  const requestWorkOrder = useMutation(api.workOrders.requestWorkOrder);

  // Show all preferred mechanics - authorization will be granted automatically when work order is created
  const availableMechanics = preferredMechanics || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedVesselId) {
      setError("Please select a vessel");
      return;
    }

    if (!selectedMechanicId) {
      setError("Please select a mechanic");
      return;
    }

    if (!description.trim()) {
      setError("Please describe the work needed");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await requestWorkOrder({
        vesselId: selectedVesselId as Id<"vessels">,
        mechanicId: selectedMechanicId as Id<"users">,
        description: description.trim(),
        urgency,
        equipmentId: selectedEquipmentId ? selectedEquipmentId as Id<"vesselEquipment"> : undefined,
      });

      if (onSuccess) {
        onSuccess(result.workOrderId);
      }
      onCancel();
    } catch (err) {
      console.error("Failed to request work order:", err);
      setError(err instanceof Error ? err.message : "Failed to request work order");
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

  const urgencyOptions = [
    { value: "routine", label: "Routine", description: "Schedule when convenient", color: "bg-gray-100 text-gray-700" },
    { value: "soon", label: "Soon", description: "Within 1-2 weeks", color: "bg-yellow-100 text-yellow-700" },
    { value: "urgent", label: "Urgent", description: "As soon as possible", color: "bg-red-100 text-red-700" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Request Work Order</h2>
              <p className="text-sm text-gray-500 mt-0.5">Get a quote from your mechanic</p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
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
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Vessel Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Select Vessel <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedVesselId}
              onChange={(e) => {
                setSelectedVesselId(e.target.value);
                setSelectedEquipmentId("");
                // Reset mechanic if they don't have access to new vessel
                if (selectedMechanicId) {
                  const hasAccess = preferredMechanics?.find(m => m.mechanicId === selectedMechanicId)
                    ?.vesselAuthorizations.some(a => a.vesselId === e.target.value && a.isAuthorized);
                  if (!hasAccess) {
                    setSelectedMechanicId("");
                  }
                }
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 text-black bg-white"
              disabled={!!preSelectedVesselId}
            >
              <option value="">Choose a vessel...</option>
              {vessels?.map((vessel) => (
                <option key={vessel._id} value={vessel._id}>
                  {vessel.name} - {vessel.year} {vessel.make} {vessel.model}
                </option>
              ))}
            </select>
          </div>

          {/* Mechanic Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Select Mechanic <span className="text-red-500">*</span>
            </label>
            {!preferredMechanics || preferredMechanics.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-sm text-gray-600 mb-2">
                  You don't have any preferred mechanics yet.
                </p>
                <a
                  href="/mechanics"
                  className="text-sm text-captain-600 hover:text-captain-700 font-medium"
                >
                  Browse the Mechanic Directory
                </a>
              </div>
            ) : (
              <select
                value={selectedMechanicId}
                onChange={(e) => setSelectedMechanicId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 text-black bg-white"
                disabled={!!preSelectedMechanicId}
              >
                <option value="">Choose a mechanic...</option>
                {availableMechanics.map((mechanic) => (
                  <option key={mechanic.mechanicId} value={mechanic.mechanicId}>
                    {mechanic.companyName || mechanic.fullName}
                    {mechanic.avgOverallRating ? ` (${mechanic.avgOverallRating.toFixed(1)} wrenches)` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Equipment Reference (Optional) */}
          {equipment && equipment.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Related Equipment
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <select
                value={selectedEquipmentId}
                onChange={(e) => setSelectedEquipmentId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 text-black bg-white"
              >
                <option value="">Select equipment if applicable...</option>
                {equipmentByCategory && Object.entries(equipmentByCategory).map(([category, items]) => (
                  <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
                    {items?.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name} {item.manufacturer ? `(${item.manufacturer})` : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Describe the Work Needed <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue or work to be performed..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 text-black placeholder-gray-400 resize-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Be specific about symptoms, when the issue started, and any relevant details
            </p>
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How urgent is this?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {urgencyOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setUrgency(option.value as typeof urgency)}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    urgency === option.value
                      ? "border-captain-500 bg-captain-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${option.color}`}>
                    {option.label}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">What happens next?</h4>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>The mechanic will be authorized for this vessel automatically</li>
              <li>They'll receive your request and provide a quote</li>
              <li>You can accept or decline the quote</li>
              <li>Once accepted, work begins!</li>
            </ol>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedVesselId || !selectedMechanicId || !description.trim()}
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
                  Request Quote
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
