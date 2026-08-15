"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { GlassCard, GlassButton, GlassBadge, GlassInput, GlassSelect, GlassModal } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";
import { PartsEntry } from "./parts-entry";
import { MessageCircle, Send } from "lucide-react";
import { InvoiceBuilder } from "./invoice-builder";

interface WorkOrderEditorProps {
  workOrderId: Id<"workOrders">;
  onClose: () => void;
  onCompleted?: () => void;
  initialTab?: "details" | "parts" | "photos" | "chat" | "rating";
}

type PhotoType = "before" | "during" | "after";

// Helper to get status badge styling
const getStatusBadge = (status: string) => {
  switch (status) {
    case "quote_requested":
      return { bg: "bg-orange-100", text: "text-orange-800", label: "Quote Requested" };
    case "quoted":
      return { bg: "bg-blue-100", text: "text-blue-800", label: "Quoted" };
    case "declined":
      return { bg: "bg-red-100", text: "text-red-800", label: "Declined" };
    case "in_progress":
      return { bg: "bg-yellow-100", text: "text-yellow-800", label: "In Progress" };
    case "completed":
      return { bg: "bg-green-100", text: "text-green-800", label: "Completed" };
    case "cancelled":
      return { bg: "bg-gray-100", text: "text-gray-800", label: "Cancelled" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-800", label: status };
  }
};

// Autosave debounce delay (2 seconds - industry standard)
const AUTOSAVE_DELAY_MS = 2000;

export function WorkOrderEditor({ workOrderId, onClose, onCompleted, initialTab = "details" }: WorkOrderEditorProps) {
  const { mode } = useTheme();
  const [activeTab, setActiveTab] = useState<"details" | "parts" | "photos" | "chat" | "rating">(initialTab);
  const [diagnosis, setDiagnosis] = useState("");
  const [workPerformed, setWorkPerformed] = useState("");
  const [laborHours, setLaborHours] = useState<string>("");
  const [laborRate, setLaborRate] = useState<string>("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showInvoiceBuilder, setShowInvoiceBuilder] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoType, setPhotoType] = useState<PhotoType>("during");
  const [messageInput, setMessageInput] = useState("");
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Autosave state
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isInitializedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs to hold latest values for flush-on-unmount (avoids stale closure)
  const latestValuesRef = useRef({
    diagnosis: "",
    workPerformed: "",
    laborHours: "",
    laborRate: "",
    estimatedCompletionDate: "",
  });
  
  // Rating states
  const [ratingValues, setRatingValues] = useState<Record<string, number>>({});
  const [ratingReview, setRatingReview] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Fetch work order data
  const workOrder = useQuery(api.workOrders.getWorkOrder, { workOrderId });

  // Fetch approved hourly rate for auto-population
  const _wo = workOrder as any;
  const approvedHourlyRate = useQuery(
    api.preferredMechanics.getApprovedHourlyRate,
    _wo ? { mechanicId: _wo.mechanicId, ownerId: _wo.ownerId } : "skip"
  );

  // Check if user can rate
  const canRateResult = useQuery(api.ratings.canRateWorkOrder, { workOrderId });
  const currentUser = useQuery(api.users.currentUser);
  
  // Chat data
  const messages = useQuery(api.workOrderMessages.getWorkOrderMessages, { workOrderId });
  const unreadCount = useQuery(api.workOrderMessages.getUnreadCount, { workOrderId });
  
  // Mutations
  const updateWorkOrder = useMutation(api.workOrders.updateWorkOrder);
  const completeWorkOrder = useMutation(api.workOrders.completeWorkOrder);
  const cancelWorkOrder = useMutation(api.workOrders.cancelWorkOrder);
  const createMechanicRating = useMutation(api.ratings.createMechanicRating);
  const createOwnerRating = useMutation(api.ratings.createOwnerRating);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const saveWorkOrderPhoto = useMutation(api.storage.saveWorkOrderPhoto);
  const deleteWorkOrderPhoto = useMutation(api.storage.deleteWorkOrderPhoto);
  const sendMessage = useMutation(api.workOrderMessages.sendWorkOrderMessage);
  const markRead = useMutation(api.workOrderMessages.markWorkOrderMessagesRead);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (activeTab === "chat" && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  // Mark messages as read when viewing chat tab
  useEffect(() => {
    if (activeTab === "chat" && unreadCount && unreadCount > 0) {
      markRead({ workOrderId });
    }
  }, [activeTab, unreadCount, workOrderId, markRead]);

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    try {
      await sendMessage({ workOrderId, content: messageInput });
      setMessageInput("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Keep the latest values ref in sync with state
  useEffect(() => {
    latestValuesRef.current = { diagnosis, workPerformed, laborHours, laborRate, estimatedCompletionDate };
  }, [diagnosis, workPerformed, laborHours, laborRate, estimatedCompletionDate]);

  // Initialize form values from work order
  useEffect(() => {
    if (workOrder && !isInitializedRef.current) {
      setDiagnosis(workOrder.diagnosis || "");
      setWorkPerformed(workOrder.workPerformed || "");
      setLaborHours(workOrder.laborHours?.toString() || "");
      // Auto-populate labor rate: use stored rate, fall back to approved rate
      const rate = workOrder.laborRate ?? approvedHourlyRate ?? undefined;
      setLaborRate(rate?.toString() || "");
      // Initialize estimated completion date
      if (workOrder.estimatedCompletionDate) {
        const date = new Date(workOrder.estimatedCompletionDate);
        setEstimatedCompletionDate(date.toISOString().split('T')[0]);
      }
      // Mark as initialized to prevent re-initialization
      isInitializedRef.current = true;
    }
  }, [workOrder?._id, approvedHourlyRate]);

  // Autosave effect - debounced save when form values change
  // This must be before any early returns to satisfy React hooks rules
  useEffect(() => {
    // Only trigger autosave after initialization and for in-progress work orders
    if (!isInitializedRef.current || !workOrder || workOrder.status !== "in_progress") {
      return;
    }

    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
    setSaveStatus("idle");

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new debounced save
    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        // Calculate totals inside the callback
        const partsTotal = workOrder.parts.reduce((sum, p) => sum + (p.unitCost || 0) * p.quantity, 0);
        const laborTotal = (parseFloat(laborHours) || 0) * (parseFloat(laborRate) || 0);
        const grandTotal = partsTotal + laborTotal;
        
        // Convert date string to timestamp if provided
        const completionTimestamp = estimatedCompletionDate 
          ? new Date(estimatedCompletionDate).getTime() 
          : undefined;

        await updateWorkOrder({
          workOrderId,
          diagnosis: diagnosis || undefined,
          workPerformed: workPerformed || undefined,
          laborHours: laborHours ? parseFloat(laborHours) : undefined,
          laborRate: laborRate ? parseFloat(laborRate) : undefined,
          totalCost: grandTotal > 0 ? grandTotal : undefined,
          estimatedCompletionDate: completionTimestamp,
        });
        
        setSaveStatus("saved");
        setHasUnsavedChanges(false);
        
        // Reset to idle after showing "Saved" for 2 seconds
        setTimeout(() => {
          setSaveStatus((current) => current === "saved" ? "idle" : current);
        }, 2000);
      } catch (err) {
        console.error("Failed to autosave:", err);
        setSaveStatus("error");
      }
    }, AUTOSAVE_DELAY_MS);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [diagnosis, workPerformed, laborHours, laborRate, estimatedCompletionDate, workOrder, workOrderId, updateWorkOrder]);

  // Flush unsaved changes on unmount — prevents data loss when closing mid-debounce
  const updateWorkOrderRef = useRef(updateWorkOrder);
  updateWorkOrderRef.current = updateWorkOrder;
  const workOrderRef = useRef(workOrder);
  workOrderRef.current = workOrder;
  
  useEffect(() => {
    return () => {
      // Clear any pending debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Flush: perform an immediate save if the work order is in_progress
      const wo = workOrderRef.current;
      if (!isInitializedRef.current || !wo || wo.status !== "in_progress") {
        return;
      }
      
      const vals = latestValuesRef.current;
      const partsTotal = wo.parts.reduce((sum, p) => sum + (p.unitCost || 0) * p.quantity, 0);
      const laborTotal = (parseFloat(vals.laborHours) || 0) * (parseFloat(vals.laborRate) || 0);
      const grandTotal = partsTotal + laborTotal;
      const completionTimestamp = vals.estimatedCompletionDate
        ? new Date(vals.estimatedCompletionDate).getTime()
        : undefined;

      // Fire-and-forget save (component is unmounting so we can't set state)
      updateWorkOrderRef.current({
        workOrderId,
        diagnosis: vals.diagnosis || undefined,
        workPerformed: vals.workPerformed || undefined,
        laborHours: vals.laborHours ? parseFloat(vals.laborHours) : undefined,
        laborRate: vals.laborRate ? parseFloat(vals.laborRate) : undefined,
        totalCost: grandTotal > 0 ? grandTotal : undefined,
        estimatedCompletionDate: completionTimestamp,
      }).catch((err) => console.error("Failed to flush save on close:", err));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId]);

  if (!workOrder) {
    return (
      <GlassModal onClose={onClose} className="max-w-2xl h-[90vh]">
        <div className="p-8 flex items-center justify-center">
          <div className="flex items-center justify-center gap-3">
            <div className={`w-6 h-6 border-2 rounded-full animate-spin ${mode === 'dark' ? "border-white/10 border-t-blue-500" : "border-captain-600 border-t-transparent"}`}></div>
            <span className={mode === 'dark' ? "text-gray-300" : "text-gray-600"}>Loading work order...</span>
          </div>
        </div>
      </GlassModal>
    );
  }

  // Calculate totals (for display purposes)
  const partsTotal = workOrder.parts.reduce((sum, p) => sum + (p.unitCost || 0) * p.quantity, 0);
  const laborTotal = (parseFloat(laborHours) || 0) * (parseFloat(laborRate) || 0);
  const grandTotal = partsTotal + laborTotal;

  // Complete work order
  const handleComplete = async () => {
    if (!workPerformed.trim()) {
      alert("Please describe the work performed before completing");
      setActiveTab("details");
      return;
    }

    setIsCompleting(true);
    try {
      await completeWorkOrder({
        workOrderId,
        workPerformed: workPerformed.trim(),
        laborHours: laborHours ? parseFloat(laborHours) : undefined,
        laborRate: laborRate ? parseFloat(laborRate) : undefined,
        totalCost: grandTotal > 0 ? grandTotal : undefined,
      });
      onCompleted?.();
      onClose();
    } catch (err) {
      console.error("Failed to complete:", err);
    } finally {
      setIsCompleting(false);
      setShowCompleteConfirm(false);
    }
  };

  // Cancel work order
  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await cancelWorkOrder({ workOrderId });
      onClose();
    } catch (err) {
      console.error("Failed to cancel:", err);
    } finally {
      setIsCancelling(false);
      setShowCancelConfirm(false);
    }
  };

  // Upload photo
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await response.json();
      
      await saveWorkOrderPhoto({
        workOrderId,
        storageId,
        photoType,
        caption: photoCaption || undefined,
      });

      setPhotoCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Failed to upload photo:", err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Delete photo
  const handleDeletePhoto = async (photoId: Id<"workOrderPhotos">) => {
    try {
      await deleteWorkOrderPhoto({ photoId });
    } catch (err) {
      console.error("Failed to delete photo:", err);
    }
  };

  // Group photos by type
  const photosByType = workOrder.photos.reduce((acc, photo) => {
    if (!acc[photo.photoType]) acc[photo.photoType] = [];
    acc[photo.photoType].push(photo);
    return acc;
  }, {} as Record<string, typeof workOrder.photos>);

  return (
    <GlassModal onClose={onClose} className="max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className={`flex-shrink-0 border-b px-6 py-4 ${mode === 'dark' ? "border-white/10" : "border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className={`text-xl font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Work Order</h2>
                {(() => {
                  const badge = getStatusBadge(workOrder.status);
                  return (
                    <span className={`px-2.5 py-1 ${badge.bg} ${badge.text} text-sm font-medium rounded-full`}>
                      {badge.label}
                    </span>
                  );
                })()}
                {/* Autosave indicator in header */}
                {workOrder.status === "in_progress" && (
                  <span className={`flex items-center gap-1.5 text-xs ${mode === 'dark' ? "text-gray-400" : "text-gray-400"}`}>
                    {saveStatus === "saving" && (
                      <>
                        <div className={`w-2.5 h-2.5 border border-t-transparent rounded-full animate-spin ${mode === 'dark' ? "border-gray-400" : "border-gray-400"}`}></div>
                        <span>Saving...</span>
                      </>
                    )}
                    {saveStatus === "saved" && (
                      <>
                        <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-green-600">Saved</span>
                      </>
                    )}
                    {saveStatus === "error" && (
                      <>
                        <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
                        </svg>
                        <span className="text-red-500">Save failed</span>
                      </>
                    )}
                  </span>
                )}
              </div>
              <p className={`text-sm mt-0.5 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                {workOrder.vessel.name} • {workOrder.vessel.make} {workOrder.vessel.model}
              </p>
            </div>
            <button
              onClick={onClose}
              className={`p-2 transition-colors ${mode === 'dark' ? "text-gray-400 hover:text-white hover:bg-white/10 rounded-lg" : "text-gray-400 hover:text-gray-600"}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 mt-4">
            {[
              { id: "details", label: "Details" },
              { id: "parts", label: `Parts (${workOrder.parts.length})` },
              { id: "photos", label: `Photos (${workOrder.photos.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`pb-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? mode === 'dark' ? "border-blue-400 text-blue-400" : "border-captain-600 text-captain-600"
                    : mode === 'dark' ? "border-transparent text-gray-400 hover:text-gray-200" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
            {/* Chat Tab with Owner Name */}
            <button
              onClick={() => setActiveTab("chat")}
              className={`pb-2 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                activeTab === "chat"
                  ? mode === 'dark' ? "border-blue-400 text-blue-400" : "border-captain-600 text-captain-600"
                  : mode === 'dark' ? "border-transparent text-gray-400 hover:text-gray-200" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <MessageCircle size={16} />
              <span>Chat with {workOrder.vessel.ownerName?.split(' ')[0] || "Owner"}</span>
              {unreadCount !== undefined && (
                <span className={`min-w-[20px] h-5 px-1.5 text-xs font-medium rounded-full flex items-center justify-center ${
                  unreadCount > 0 
                    ? "bg-red-500 text-white" 
                    : mode === 'dark' ? "bg-white/10 text-gray-400" : "bg-gray-200 text-gray-500"
                }`}>
                  {unreadCount}
                </span>
              )}
            </button>
            
            {/* Rating Tab - Show when completed and can rate */}
            {workOrder.status === "completed" && canRateResult?.canRate && (
              <button
                onClick={() => setActiveTab("rating")}
                className={`pb-2 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                  activeTab === "rating"
                    ? mode === 'dark' ? "border-blue-400 text-blue-400" : "border-captain-600 text-captain-600"
                    : mode === 'dark' ? "border-transparent text-gray-400 hover:text-gray-200" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {canRateResult.ratingType === "mechanic" ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                )}
                <span className="text-orange-600 font-semibold">Leave Review</span>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Details Tab */}
          {activeTab === "details" && (
            <div className="space-y-6">
              {/* Description (read-only) */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                  Work Description
                </label>
                <div className={`p-3 rounded-lg ${mode === 'dark' ? "bg-white/5 text-gray-200" : "bg-gray-50 text-gray-900"}`}>
                  {workOrder.description}
                </div>
              </div>

              {/* Estimated Completion Date - Editable for mechanics on in_progress, read-only otherwise */}
              {currentUser?.role === "mechanic" && workOrder.status === "in_progress" ? (
                <div className={`p-4 rounded-lg border ${mode === 'dark' ? "bg-white/5 border-white/10" : "bg-captain-50 border-captain-200"}`}>
                  <label className={`block text-sm font-medium mb-2 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                    Estimated Completion Date
                  </label>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${mode === 'dark' ? "bg-captain-500/20" : "bg-captain-100"}`}>
                      <svg className={`w-5 h-5 ${mode === 'dark' ? "text-captain-400" : "text-captain-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="date"
                      value={estimatedCompletionDate}
                      onChange={(e) => setEstimatedCompletionDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 ${mode === 'dark' ? "bg-black/20 border-white/10 text-white" : "border-captain-300 text-black bg-white"}`}
                    />
                  </div>
                  <p className={`text-xs mt-2 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Update when you expect to complete the work</p>
                </div>
              ) : workOrder.estimatedCompletionDate ? (
                <div className={`p-4 rounded-lg border ${mode === 'dark' ? "bg-white/5 border-white/10" : "bg-captain-50 border-captain-200"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${mode === 'dark' ? "bg-captain-500/20" : "bg-captain-100"}`}>
                      <svg className={`w-5 h-5 ${mode === 'dark' ? "text-captain-400" : "text-captain-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>Estimated Completion Date</p>
                      <p className={`font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
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
              ) : null}

              {/* Estimated Labor */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                  Estimated Labor
                </label>
                <textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Describe the estimated labor and work to be performed..."
                  rows={3}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 resize-none ${mode === 'dark' ? "bg-black/20 border-white/10 text-white placeholder-gray-500" : "border-gray-300 text-black placeholder-gray-400"}`}
                />
              </div>

              {/* Labor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                    Labor Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={laborHours}
                    onChange={(e) => setLaborHours(e.target.value)}
                    placeholder="0"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 ${mode === 'dark' ? "bg-black/20 border-white/10 text-white placeholder-gray-500" : "border-gray-300 text-black placeholder-gray-400"}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                    Hourly Rate ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={laborRate}
                    onChange={(e) => setLaborRate(e.target.value)}
                    placeholder="0.00"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 ${mode === 'dark' ? "bg-black/20 border-white/10 text-white placeholder-gray-500" : "border-gray-300 text-black placeholder-gray-400"}`}
                  />
                </div>
              </div>

              {/* Cost Summary */}
              <div className={`rounded-lg p-4 ${mode === 'dark' ? "bg-white/5" : "bg-gray-50"}`}>
                <h4 className={`font-medium mb-3 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Cost Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={mode === 'dark' ? "text-gray-400" : "text-gray-600"}>Parts Total</span>
                    <span className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>${partsTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={mode === 'dark' ? "text-gray-400" : "text-gray-600"}>Labor ({laborHours || 0} hrs × ${laborRate || 0}/hr)</span>
                    <span className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>${laborTotal.toFixed(2)}</span>
                  </div>
                  <div className={`flex justify-between pt-2 border-t ${mode === 'dark' ? "border-white/10" : "border-gray-200"}`}>
                    <span className={`font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Grand Total</span>
                    <span className={`font-bold text-lg ${mode === 'dark' ? "text-captain-400" : "text-captain-600"}`}>${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Autosave Status Indicator */}
              <div className="flex items-center justify-center gap-2 py-2 text-sm">
                {saveStatus === "saving" && (
                  <>
                    <div className={`w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin ${mode === 'dark' ? "border-captain-400" : "border-captain-500"}`}></div>
                    <span className={mode === 'dark' ? "text-gray-400" : "text-gray-500"}>Saving changes...</span>
                  </>
                )}
                {saveStatus === "saved" && (
                  <>
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-600">All changes saved</span>
                  </>
                )}
                {saveStatus === "error" && (
                  <>
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-red-600">Failed to save</span>
                  </>
                )}
                {saveStatus === "idle" && hasUnsavedChanges && (
                  <span className={`text-xs ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>Changes will be saved automatically</span>
                )}
              </div>
            </div>
          )}

          {/* Parts Tab */}
          {activeTab === "parts" && (
            <PartsEntry
              workOrderId={workOrderId}
              vesselId={workOrder.vesselId as Id<"vessels">}
            />
          )}

          {/* Photos Tab */}
          {activeTab === "photos" && (
            <div className="space-y-6">
              {/* Upload Section */}
              <div className={`rounded-lg p-4 ${mode === 'dark' ? "bg-white/5" : "bg-gray-50"}`}>
                <h4 className={`font-medium mb-3 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Add Photo</h4>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {(["before", "during", "after"] as PhotoType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setPhotoType(type)}
                      className={`py-2 px-4 rounded-lg border font-medium text-sm transition-colors ${
                        photoType === type
                          ? "border-captain-600 bg-captain-50 text-captain-700"
                          : mode === 'dark'
                            ? "border-gray-700 text-gray-400 hover:bg-white/10 hover:text-white"
                            : "border-gray-300 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="Add a caption (optional)..."
                  className={`w-full px-4 py-2 mb-3 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 ${
                    mode === 'dark'
                      ? "bg-black/20 border-white/10 text-white placeholder-gray-500"
                      : "border-gray-300 text-black placeholder-gray-400"
                  }`}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex-1 py-2.5 bg-captain-600 text-white rounded-lg hover:bg-captain-700 disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {uploadingPhoto ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Upload Photo
                      </>
                    )}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              {/* Photo Gallery */}
              {(["before", "during", "after"] as PhotoType[]).map((type) => (
                photosByType[type] && photosByType[type].length > 0 && (
                  <div key={type}>
                    <h4 className={`font-medium mb-3 capitalize ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{type} Photos</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {photosByType[type].map((photo) => (
                        <div key={photo._id} className="relative group">
                          <img
                            src={photo.url || ""}
                            alt={photo.caption || `${type} photo`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          {photo.caption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 rounded-b-lg truncate">
                              {photo.caption}
                            </div>
                          )}
                          <button
                            onClick={() => handleDeletePhoto(photo._id as Id<"workOrderPhotos">)}
                            className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}

              {workOrder.photos.length === 0 && (
                <div className={`text-center py-8 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                  <svg className={`w-12 h-12 mx-auto mb-3 ${mode === 'dark' ? "text-gray-600" : "text-gray-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p>No photos added yet</p>
                  <p className={`text-sm mt-1 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>Upload before, during, and after photos to document your work</p>
                </div>
              )}
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === "chat" && (
            <div className="flex flex-col h-[400px]">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {messages && messages.length > 0 ? (
                  <>
                    {messages.map((msg) => (
                      <div
                        key={msg._id}
                        className={`flex ${msg.isCurrentUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                            msg.isCurrentUser
                              ? "bg-captain-600 text-white rounded-br-md"
                              : mode === 'dark'
                                ? "bg-white/10 text-white rounded-bl-md"
                                : "bg-gray-100 text-gray-900 rounded-bl-md"
                          }`}
                        >
                          {!msg.isCurrentUser && (
                            <div className={`text-xs font-medium mb-1 ${mode === 'dark' ? "text-blue-400" : "text-captain-600"}`}>
                              {msg.senderName}
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <div
                            className={`text-[10px] mt-1 ${
                              msg.isCurrentUser 
                                ? "text-captain-200" 
                                : mode === 'dark' ? "text-gray-400" : "text-gray-400"
                            }`}
                          >
                            {formatTime(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageCircle size={40} className={`mb-3 ${mode === 'dark' ? "text-gray-600" : "text-gray-300"}`} />
                    <p className={`font-medium ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>No messages yet</p>
                    <p className={`text-sm mt-1 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>
                      Start a conversation with {workOrder.vessel.ownerName?.split(' ')[0] || "the owner"} about this work order.
                    </p>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className={`border-t pt-4 flex-shrink-0 ${mode === 'dark' ? "border-white/10" : "border-gray-200"}`}>
                <div className="flex items-end gap-2">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    rows={1}
                    className={`flex-1 resize-none rounded-xl border px-4 py-2.5 text-sm focus:border-captain-500 focus:ring-2 focus:ring-captain-100 outline-none ${
                      mode === 'dark'
                        ? "bg-black/20 border-white/10 text-white placeholder-gray-500"
                        : "border-gray-300 text-gray-900"
                    }`}
                    style={{ minHeight: "42px", maxHeight: "120px" }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    className="p-2.5 bg-captain-600 text-white rounded-xl hover:bg-captain-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Rating Tab */}
          {activeTab === "rating" && canRateResult?.canRate && (
            <div className="space-y-6">
              <div className={`text-center pb-4 border-b ${mode === 'dark' ? "border-white/10" : "border-gray-200"}`}>
                <h3 className={`text-lg font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
                  {canRateResult.ratingType === "mechanic" 
                    ? "Rate the Mechanic" 
                    : "Rate the Owner"}
                </h3>
                <p className={`text-sm mt-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                  {canRateResult.ratingType === "mechanic"
                    ? "Your feedback helps other boat owners make informed decisions"
                    : "Your rating helps build trust in the QR Captain community"}
                </p>
              </div>

              {/* Rating Criteria */}
              <div className="space-y-4">
                {canRateResult.ratingType === "mechanic" ? (
                  // Owner rating mechanic (wrench icons)
                  <>
                    {[
                      { key: "quality", label: "Quality of Work", description: "How well was the work performed?" },
                      { key: "communication", label: "Communication", description: "Were they responsive and clear?" },
                      { key: "professionalism", label: "Professionalism", description: "Were they courteous and respectful?" },
                      { key: "value", label: "Value for Money", description: "Was the pricing fair for the work done?" },
                    ].map((criteria) => (
                      <div key={criteria.key} className={`p-4 rounded-lg ${mode === 'dark' ? "bg-white/5" : "bg-gray-50"}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{criteria.label}</p>
                            <p className={`text-xs ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{criteria.description}</p>
                          </div>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((value) => (
                              <button
                                key={value}
                                onClick={() => setRatingValues(prev => ({ ...prev, [criteria.key]: value }))}
                                className={`p-1 transition-colors ${
                                  (ratingValues[criteria.key] || 0) >= value
                                    ? "text-orange-500"
                                    : "text-gray-300 hover:text-orange-300"
                                }`}
                              >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                </svg>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  // Mechanic rating owner (star icons)
                  <>
                    {[
                      { key: "communication", label: "Communication", description: "Were they responsive and clear about their needs?" },
                      { key: "preparedness", label: "Preparedness", description: "Was the boat ready and accessible for work?" },
                      { key: "payment", label: "Payment", description: "Was payment prompt and hassle-free?" },
                      { key: "respect", label: "Respectfulness", description: "Were they courteous and professional?" },
                    ].map((criteria) => (
                      <div key={criteria.key} className={`p-4 rounded-lg ${mode === 'dark' ? "bg-white/5" : "bg-gray-50"}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{criteria.label}</p>
                            <p className={`text-xs ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{criteria.description}</p>
                          </div>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((value) => (
                              <button
                                key={value}
                                onClick={() => setRatingValues(prev => ({ ...prev, [criteria.key]: value }))}
                                className={`p-1 transition-colors ${
                                  (ratingValues[criteria.key] || 0) >= value
                                    ? "text-yellow-500"
                                    : "text-gray-300 hover:text-yellow-300"
                                }`}
                              >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Written Review */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                  Written Review (optional)
                </label>
                <textarea
                  value={ratingReview}
                  onChange={(e) => setRatingReview(e.target.value)}
                  placeholder={canRateResult.ratingType === "mechanic" 
                    ? "Share details about your experience with this mechanic..."
                    : "Share details about your experience working with this owner..."}
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 resize-none ${mode === 'dark' ? "bg-black/20 border-white/10 text-white placeholder-gray-500" : "border-gray-300 text-black placeholder-gray-400"}`}
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={async () => {
                  setIsSubmittingRating(true);
                  try {
                    if (canRateResult.ratingType === "mechanic") {
                      await createMechanicRating({
                        workOrderId,
                        qualityRating: ratingValues.quality || 3,
                        communicationRating: ratingValues.communication || 3,
                        professionalismRating: ratingValues.professionalism || 3,
                        valueRating: ratingValues.value || 3,
                        review: ratingReview || undefined,
                      });
                    } else {
                      await createOwnerRating({
                        workOrderId,
                        communicationRating: ratingValues.communication || 3,
                        preparednessRating: ratingValues.preparedness || 3,
                        paymentRating: ratingValues.payment || 3,
                        respectRating: ratingValues.respect || 3,
                        review: ratingReview || undefined,
                      });
                    }
                    onClose();
                  } catch (err) {
                    console.error("Failed to submit rating:", err);
                    alert(err instanceof Error ? err.message : "Failed to submit rating");
                  } finally {
                    setIsSubmittingRating(false);
                  }
                }}
                disabled={isSubmittingRating || Object.keys(ratingValues).length === 0}
                className="w-full py-3 bg-captain-600 text-white rounded-lg hover:bg-captain-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
              >
                {isSubmittingRating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Submit Review
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions - Only show for in_progress orders and for mechanics */}
        {workOrder.status === "in_progress" && currentUser?.role === "mechanic" && (
          <div className={`flex-shrink-0 border-t px-6 py-4 ${mode === 'dark' ? "border-white/10" : "border-gray-200"}`}>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(true)}
                className={`px-4 py-2.5 border rounded-lg transition-colors font-medium ${
                  mode === 'dark'
                    ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                    : "border-red-300 text-red-600 hover:bg-red-50"
                }`}
              >
                Cancel Order
              </button>
              <div className="flex-1"></div>
              <button
                onClick={onClose}
                className={`px-4 py-2.5 border rounded-lg transition-colors font-medium ${
                  mode === 'dark'
                    ? "border-white/10 text-gray-300 hover:bg-white/5"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Close
              </button>
              <button
                onClick={() => setShowCompleteConfirm(true)}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Complete Work Order
              </button>
            </div>
          </div>
        )}

        {/* Footer for completed/other status */}
        {(workOrder.status !== "in_progress" || currentUser?.role !== "mechanic") && (
          <div className={`flex-shrink-0 border-t px-6 py-4 ${mode === 'dark' ? "border-white/10" : "border-gray-200"}`}>
            <div className="flex items-center justify-between gap-3">
              {workOrder.status === "completed" && currentUser?.role === "mechanic" && (
                <button
                  onClick={() => setShowInvoiceBuilder(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-captain-500/15 hover:bg-captain-500/25 border border-captain-500/30 text-captain-300 text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Create Invoice
                </button>
              )}
              <button
                onClick={onClose}
                className={`ml-auto px-4 py-2.5 border rounded-lg transition-colors font-medium ${
                  mode === 'dark'
                    ? "border-white/10 text-gray-300 hover:bg-white/5"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showInvoiceBuilder && (
          <InvoiceBuilder
            workOrderId={workOrderId}
            onClose={() => setShowInvoiceBuilder(false)}
          />
        )}

        {/* Complete Confirmation Modal */}
        {showCompleteConfirm && (
          <div className={`absolute inset-0 flex items-center justify-center rounded-xl z-50 ${mode === 'dark' ? "bg-black/70 backdrop-blur-sm" : "bg-black/50 backdrop-blur-sm"}`}>
            <div className={`rounded-lg p-6 max-w-md mx-4 border shadow-xl ${mode === 'dark' ? "bg-[#1A1A23] border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
              <h3 className={`text-lg font-semibold mb-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Complete Work Order?</h3>
              <p className={`mb-4 ${mode === 'dark' ? "text-gray-300" : "text-gray-600"}`}>
                This will mark the work order as completed and notify the vessel owner. 
                Make sure you've documented all work performed and added any parts used.
              </p>
              <div className={`rounded-lg p-3 mb-4 ${mode === 'dark' ? "bg-white/5" : "bg-gray-50"}`}>
                <div className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>Total Cost</div>
                <div className={`text-2xl font-bold ${mode === 'dark' ? "text-captain-400" : "text-captain-600"}`}>${grandTotal.toFixed(2)}</div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCompleteConfirm(false)}
                  className={`flex-1 px-4 py-2 border rounded-lg transition-colors font-medium ${
                    mode === 'dark'
                      ? "border-white/10 text-gray-300 hover:bg-white/5"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isCompleting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {isCompleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Completing...
                    </>
                  ) : (
                    "Complete"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (
          <div className={`absolute inset-0 flex items-center justify-center rounded-xl z-50 ${mode === 'dark' ? "bg-black/70 backdrop-blur-sm" : "bg-black/50 backdrop-blur-sm"}`}>
            <div className={`rounded-lg p-6 max-w-md mx-4 border shadow-xl ${mode === 'dark' ? "bg-[#1A1A23] border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
              <h3 className={`text-lg font-semibold mb-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Cancel Work Order?</h3>
              <p className={`mb-4 ${mode === 'dark' ? "text-gray-300" : "text-gray-600"}`}>
                This will cancel the work order. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className={`flex-1 px-4 py-2 border rounded-lg transition-colors font-medium ${
                    mode === 'dark'
                      ? "border-white/10 text-gray-300 hover:bg-white/5"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Keep Working
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {isCancelling ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Cancelling...
                    </>
                  ) : (
                    "Cancel Order"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </GlassModal>
  );
}
