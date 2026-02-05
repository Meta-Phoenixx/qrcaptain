"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { PartsEntry } from "./parts-entry";
import { MessageCircle, Send } from "lucide-react";

interface WorkOrderEditorProps {
  workOrderId: Id<"workOrders">;
  onClose: () => void;
  onCompleted?: () => void;
}

type PhotoType = "before" | "during" | "after";

export function WorkOrderEditor({ workOrderId, onClose, onCompleted }: WorkOrderEditorProps) {
  const [activeTab, setActiveTab] = useState<"details" | "parts" | "photos" | "chat">("details");
  const [diagnosis, setDiagnosis] = useState("");
  const [workPerformed, setWorkPerformed] = useState("");
  const [laborHours, setLaborHours] = useState<string>("");
  const [laborRate, setLaborRate] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoType, setPhotoType] = useState<PhotoType>("during");
  const [messageInput, setMessageInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch work order data
  const workOrder = useQuery(api.workOrders.getWorkOrder, { workOrderId });
  
  // Chat data
  const messages = useQuery(api.workOrderMessages.getWorkOrderMessages, { workOrderId });
  const unreadCount = useQuery(api.workOrderMessages.getUnreadCount, { workOrderId });
  
  // Mutations
  const updateWorkOrder = useMutation(api.workOrders.updateWorkOrder);
  const completeWorkOrder = useMutation(api.workOrders.completeWorkOrder);
  const cancelWorkOrder = useMutation(api.workOrders.cancelWorkOrder);
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

  // Initialize form values from work order
  useState(() => {
    if (workOrder) {
      setDiagnosis(workOrder.diagnosis || "");
      setWorkPerformed(workOrder.workPerformed || "");
      setLaborHours(workOrder.laborHours?.toString() || "");
      setLaborRate(workOrder.laborRate?.toString() || "");
    }
  });

  if (!workOrder) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="flex items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-captain-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-600">Loading work order...</span>
          </div>
        </div>
      </div>
    );
  }

  // Calculate totals
  const partsTotal = workOrder.parts.reduce((sum, p) => sum + (p.unitCost || 0) * p.quantity, 0);
  const laborTotal = (parseFloat(laborHours) || 0) * (parseFloat(laborRate) || 0);
  const grandTotal = partsTotal + laborTotal;

  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateWorkOrder({
        workOrderId,
        diagnosis: diagnosis || undefined,
        workPerformed: workPerformed || undefined,
        laborHours: laborHours ? parseFloat(laborHours) : undefined,
        laborRate: laborRate ? parseFloat(laborRate) : undefined,
        totalCost: grandTotal > 0 ? grandTotal : undefined,
      });
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setIsSaving(false);
    }
  };

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-gray-900">Work Order</h2>
                <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                  In Progress
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {workOrder.vessel.name} • {workOrder.vessel.make} {workOrder.vessel.model}
              </p>
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
                    ? "border-captain-600 text-captain-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
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
                  ? "border-captain-600 text-captain-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <MessageCircle size={16} />
              <span>Chat with {workOrder.vessel.ownerName?.split(' ')[0] || "Owner"}</span>
              {unreadCount !== undefined && (
                <span className={`min-w-[20px] h-5 px-1.5 text-xs font-medium rounded-full flex items-center justify-center ${
                  unreadCount > 0 
                    ? "bg-red-500 text-white" 
                    : "bg-gray-200 text-gray-500"
                }`}>
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Details Tab */}
          {activeTab === "details" && (
            <div className="space-y-6">
              {/* Description (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Work Description
                </label>
                <div className="p-3 bg-gray-50 rounded-lg text-gray-900">
                  {workOrder.description}
                </div>
              </div>

              {/* Diagnosis */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Diagnosis
                </label>
                <textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Describe what you found during inspection..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 text-black placeholder-gray-400 resize-none"
                />
              </div>

              {/* Work Performed */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Work Performed <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-1">(required to complete)</span>
                </label>
                <textarea
                  value={workPerformed}
                  onChange={(e) => setWorkPerformed(e.target.value)}
                  placeholder="Describe the work you performed..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 text-black placeholder-gray-400 resize-none"
                />
              </div>

              {/* Labor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Labor Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={laborHours}
                    onChange={(e) => setLaborHours(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 text-black placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Hourly Rate ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={laborRate}
                    onChange={(e) => setLaborRate(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 text-black placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Cost Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Cost Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Parts Total</span>
                    <span className="font-medium text-gray-900">${partsTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Labor ({laborHours || 0} hrs × ${laborRate || 0}/hr)</span>
                    <span className="font-medium text-gray-900">${laborTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="font-semibold text-gray-900">Grand Total</span>
                    <span className="font-bold text-lg text-captain-600">${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Progress
                  </>
                )}
              </button>
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
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Add Photo</h4>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {(["before", "during", "after"] as PhotoType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setPhotoType(type)}
                      className={`py-2 px-4 rounded-lg border font-medium text-sm transition-colors ${
                        photoType === type
                          ? "border-captain-600 bg-captain-50 text-captain-700"
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
                  className="w-full px-4 py-2 mb-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 text-black placeholder-gray-400"
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
                    <h4 className="font-medium text-gray-900 mb-3 capitalize">{type} Photos</h4>
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
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p>No photos added yet</p>
                  <p className="text-sm mt-1">Upload before, during, and after photos to document your work</p>
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
                              : "bg-gray-100 text-gray-900 rounded-bl-md"
                          }`}
                        >
                          {!msg.isCurrentUser && (
                            <div className="text-xs font-medium text-captain-600 mb-1">
                              {msg.senderName}
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <div
                            className={`text-[10px] mt-1 ${
                              msg.isCurrentUser ? "text-captain-200" : "text-gray-400"
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
                    <MessageCircle size={40} className="text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">No messages yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Start a conversation with {workOrder.vessel.ownerName?.split(' ')[0] || "the owner"} about this work order.
                    </p>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="border-t border-gray-200 pt-4 flex-shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-captain-500 focus:ring-2 focus:ring-captain-100 outline-none"
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
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4">
          <div className="flex gap-3">
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="px-4 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
            >
              Cancel Order
            </button>
            <div className="flex-1"></div>
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
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

        {/* Complete Confirmation Modal */}
        {showCompleteConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Complete Work Order?</h3>
              <p className="text-gray-600 mb-4">
                This will mark the work order as completed and notify the vessel owner. 
                Make sure you've documented all work performed and added any parts used.
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="text-sm text-gray-600">Total Cost</div>
                <div className="text-2xl font-bold text-captain-600">${grandTotal.toFixed(2)}</div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCompleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
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
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Work Order?</h3>
              <p className="text-gray-600 mb-4">
                This will cancel the work order. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
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
      </div>
    </div>
  );
}
