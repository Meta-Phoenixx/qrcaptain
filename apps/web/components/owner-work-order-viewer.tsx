"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  X,
  Clock,
  User,
  Building2,
  Wrench,
  Package,
  Camera,
  Calendar,
  MessageCircle,
  Send,
  AlertCircle,
  DollarSign,
} from "lucide-react";

interface OwnerWorkOrderViewerProps {
  workOrderId: Id<"workOrders">;
  onClose: () => void;
}

export function OwnerWorkOrderViewer({
  workOrderId,
  onClose,
}: OwnerWorkOrderViewerProps) {
  const [activeTab, setActiveTab] = useState<"details" | "chat">("details");
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const workOrder = useQuery(api.workOrders.getWorkOrder, { workOrderId });
  const messages = useQuery(api.workOrderMessages.getWorkOrderMessages, { workOrderId });
  const unreadCount = useQuery(api.workOrderMessages.getUnreadCount, { workOrderId });
  
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

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (!workOrder) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-2xl mx-4 rounded-2xl bg-white shadow-2xl p-8">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-captain-200 border-t-captain-600"></div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate elapsed time
  const startDate = new Date(workOrder.startedAt);
  const now = new Date();
  const daysElapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const hoursElapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60));
  
  let elapsedLabel = "";
  if (daysElapsed > 0) {
    elapsedLabel = `${daysElapsed} day${daysElapsed > 1 ? "s" : ""} in progress`;
  } else if (hoursElapsed > 0) {
    elapsedLabel = `${hoursElapsed} hour${hoursElapsed > 1 ? "s" : ""} in progress`;
  } else {
    elapsedLabel = "Just started";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">Work Order</h2>
                  <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
                    In Progress
                  </span>
                </div>
                <p className="text-amber-100 text-sm">{elapsedLabel}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setActiveTab("details")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "details"
                ? "text-amber-600 border-b-2 border-amber-500 bg-amber-50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Wrench size={16} />
              Details
            </div>
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === "chat"
                ? "text-amber-600 border-b-2 border-amber-500 bg-amber-50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <MessageCircle size={16} />
              <span>Chat with {workOrder.mechanic?.name?.split(' ')[0] || "Mechanic"}</span>
              {unreadCount !== undefined && (
                <span className={`min-w-[20px] h-5 px-1.5 text-xs font-medium rounded-full flex items-center justify-center ${
                  unreadCount > 0 
                    ? "bg-red-500 text-white" 
                    : "bg-gray-200 text-gray-500"
                }`}>
                  {unreadCount}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "details" ? (
            <div className="p-6 space-y-4">
              {/* Description */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700">{workOrder.description}</p>
              </div>

              {/* Mechanic Info */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User size={16} />
                  Assigned Mechanic
                </h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <Wrench size={18} className="text-amber-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {workOrder.mechanic?.name || "Unknown"}
                    </div>
                    {workOrder.mechanic?.company && (
                      <div className="text-sm text-gray-500">{workOrder.mechanic.company}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Calendar size={16} />
                  Timeline
                </h4>
                <div className="text-sm text-gray-600">
                  Started: {formatDate(workOrder.startedAt)}
                </div>
              </div>

              {/* Diagnosis */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <AlertCircle size={16} />
                  Diagnosis
                  <span className="text-xs font-normal text-amber-600">(entered so far)</span>
                </h4>
                {workOrder.diagnosis ? (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{workOrder.diagnosis}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No diagnosis entered yet</p>
                )}
              </div>

              {/* Work Performed */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Wrench size={16} />
                  Work Performed
                  <span className="text-xs font-normal text-amber-600">(entered so far)</span>
                </h4>
                {workOrder.workPerformed ? (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{workOrder.workPerformed}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No work notes entered yet</p>
                )}
              </div>

              {/* Parts */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Package size={16} />
                  Parts Added
                  <span className="text-xs font-normal text-amber-600">(so far: {workOrder.parts?.length || 0})</span>
                </h4>
                {workOrder.parts && workOrder.parts.length > 0 ? (
                  <div className="space-y-2">
                    {workOrder.parts.map((part) => (
                      <div
                        key={part._id}
                        className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{part.name}</div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {part.partNumber && <span>P/N: {part.partNumber}</span>}
                            {part.manufacturer && <span>{part.manufacturer}</span>}
                            <span>Qty: {part.quantity}</span>
                          </div>
                        </div>
                        {part.unitCost !== undefined && (
                          <div className="text-sm font-medium text-gray-700">
                            {formatCurrency(part.unitCost * part.quantity)}
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between text-sm">
                      <span className="text-gray-600">Parts subtotal</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(workOrder.parts.reduce((sum, p) => sum + (p.unitCost || 0) * p.quantity, 0))}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No parts added yet</p>
                )}
              </div>

              {/* Photos */}
              {workOrder.photos && workOrder.photos.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Camera size={16} />
                    Work Photos ({workOrder.photos.length})
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {workOrder.photos.map((photo) => (
                      <div key={photo._id} className="relative">
                        {photo.url ? (
                          <img
                            src={photo.url}
                            alt={photo.caption || "Work photo"}
                            className="w-full aspect-square object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                            <Camera size={20} className="text-gray-400" />
                          </div>
                        )}
                        <div className="absolute top-1 left-1">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              photo.photoType === "before"
                                ? "bg-blue-100 text-blue-700"
                                : photo.photoType === "during"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {photo.photoType}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Estimated Cost */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                  <DollarSign size={16} />
                  Estimated Cost
                  <span className="text-xs font-normal">(preliminary)</span>
                </h4>
                <div className="flex items-center justify-between">
                  <span className="text-amber-700">Current running total</span>
                  <span className="text-xl font-bold text-amber-800">
                    {workOrder.totalCost !== undefined ? formatCurrency(workOrder.totalCost) : "—"}
                  </span>
                </div>
                <p className="text-xs text-amber-600 mt-2">
                  Final cost will be provided when the work order is completed.
                </p>
              </div>
            </div>
          ) : (
            // Chat Tab
            <div className="flex flex-col h-[400px]">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                              ? "bg-amber-500 text-white rounded-br-md"
                              : "bg-gray-100 text-gray-900 rounded-bl-md"
                          }`}
                        >
                          {!msg.isCurrentUser && (
                            <div className="text-xs font-medium text-amber-600 mb-1">
                              {msg.senderName}
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <div
                            className={`text-[10px] mt-1 ${
                              msg.isCurrentUser ? "text-amber-200" : "text-gray-400"
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
                      Start a conversation with {workOrder.mechanic?.name?.split(' ')[0] || "your mechanic"} about this work order.
                    </p>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="border-t border-gray-200 p-4 flex-shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none"
                    style={{ minHeight: "42px", maxHeight: "120px" }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    className="p-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex-shrink-0 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default OwnerWorkOrderViewer;
