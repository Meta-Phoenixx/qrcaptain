"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { GlassModal, GlassButton, GlassSelect, GlassInput } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";

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
  const { mode } = useTheme();

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
    { value: "routine", label: "Routine", description: "Schedule when convenient", color: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-500/30" },
    { value: "soon", label: "Soon", description: "Within 1-2 weeks", color: "bg-yellow-100 text-yellow-700 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30" },
    { value: "urgent", label: "Urgent", description: "As soon as possible", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30" },
  ];

  return (
    <GlassModal onClose={onCancel} className="max-w-lg">
        {/* Header */}
        <div className={`sticky top-0 border-b px-6 py-4 rounded-t-xl backdrop-blur-md ${mode === 'dark' ? "bg-black/20 border-white/10" : "bg-white border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Request Work Order</h2>
              <p className={`text-sm mt-0.5 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Get a quote from your mechanic</p>
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
            <div className={`p-3 border rounded-lg text-sm ${mode === 'dark' ? "bg-red-500/10 border-red-500/20 text-red-300" : "bg-red-50 border-red-200 text-red-700"}`}>
              {error}
            </div>
          )}

          {/* Vessel Selection */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
              Select Vessel <span className="text-red-500">*</span>
            </label>
            <GlassSelect
              value={selectedVesselId}
              onChange={(e) => {
                setSelectedVesselId(e.target.value);
                setSelectedEquipmentId("");
                // Reset mechanic if they don't have access to new vessel
                if (selectedMechanicId) {
                  const hasAccess = preferredMechanics?.find((m: any) => m?.mechanicId === selectedMechanicId)
                    ?.vesselAuthorizations?.some((a: any) => a?.vesselId === e.target.value && a?.isAuthorized);
                  if (!hasAccess) {
                    setSelectedMechanicId("");
                  }
                }
              }}
              disabled={!!preSelectedVesselId}
            >
              <option value="">Choose a vessel...</option>
              {vessels?.map((vessel) => (
                <option key={vessel._id} value={vessel._id}>
                  {vessel.name} - {vessel.year} {vessel.make} {vessel.model}
                </option>
              ))}
            </GlassSelect>
          </div>

          {/* Mechanic Selection */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
              Select Mechanic <span className="text-red-500">*</span>
            </label>
            {!preferredMechanics || preferredMechanics.length === 0 ? (
              <div className={`p-4 rounded-lg text-center ${mode === 'dark' ? "bg-white/5" : "bg-gray-50"}`}>
                <p className={`text-sm mb-2 ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>
                  You don&apos;t have any preferred mechanics yet.
                </p>
                <a
                  href="/mechanics"
                  className={mode === 'dark' ? "text-sm text-blue-400 hover:text-blue-300 font-medium" : "text-sm text-captain-600 hover:text-captain-700 font-medium"}
                >
                  Browse the Mechanic Directory
                </a>
              </div>
            ) : (
              <GlassSelect
                value={selectedMechanicId}
                onChange={(e) => setSelectedMechanicId(e.target.value)}
                disabled={!!preSelectedMechanicId}
              >
                <option value="">Choose a mechanic...</option>
                {availableMechanics.filter((m): m is NonNullable<typeof m> => m != null).map((mechanic) => (
                  <option key={mechanic.mechanicId} value={mechanic.mechanicId}>
                    {mechanic.companyName || (mechanic.firstName && mechanic.lastName ? `${mechanic.firstName} ${mechanic.lastName}` : "Unknown")}
                    {mechanic.avgOverallRating ? ` (${mechanic.avgOverallRating.toFixed(1)} wrenches)` : ""}
                  </option>
                ))}
              </GlassSelect>
            )}
          </div>

          {/* Equipment Reference (Optional) */}
          {equipment && equipment.length > 0 && (
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                Related Equipment
                <span className={`font-normal ml-1 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>(optional)</span>
              </label>
              <GlassSelect
                value={selectedEquipmentId}
                onChange={(e) => setSelectedEquipmentId(e.target.value)}
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
              </GlassSelect>
            </div>
          )}

          {/* Description */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
              Describe the Work Needed <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue or work to be performed..."
              rows={4}
              className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-1 resize-none ${
                mode === 'dark' 
                  ? "bg-black/20 border border-white/10 text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-blue-500/50" 
                  : "bg-white/50 border border-gray-300 text-black placeholder-gray-400 focus:ring-captain-500 focus:border-captain-500"
              }`}
            />
            <p className={`mt-1 text-xs ${mode === 'dark' ? "text-gray-500" : "text-gray-500"}`}>
              Be specific about symptoms, when the issue started, and any relevant details
            </p>
          </div>

          {/* Urgency */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
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
                      ? mode === 'dark' ? "border-blue-500/50 bg-blue-500/10" : "border-captain-500 bg-captain-50"
                      : mode === 'dark' ? "border-white/5 hover:border-white/20" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${mode === 'dark' ? "backdrop-blur-sm" : ""} ${option.color}`}>
                    {option.label}
                  </span>
                  <p className={`text-xs mt-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className={`rounded-lg p-4 ${mode === 'dark' ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-50"}`}>
            <h4 className={`text-sm font-medium mb-2 ${mode === 'dark' ? "text-blue-300" : "text-blue-900"}`}>What happens next?</h4>
            <ol className={`text-sm space-y-1 list-decimal list-inside ${mode === 'dark' ? "text-blue-200" : "text-blue-700"}`}>
              <li>The mechanic will be authorized for this vessel automatically</li>
              <li>They&apos;ll receive your request and provide a quote</li>
              <li>You can accept or decline the quote</li>
              <li>Once accepted, work begins!</li>
            </ol>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <GlassButton
              type="button"
              variant="secondary"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </GlassButton>
            <GlassButton
              type="submit"
              variant="primary"
              disabled={isSubmitting || !selectedVesselId || !selectedMechanicId || !description.trim()}
              className="flex-1 flex items-center justify-center gap-2"
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
            </GlassButton>
          </div>
        </form>
    </GlassModal>
  );
}
