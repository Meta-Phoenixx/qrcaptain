"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  X,
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Building2,
  Wrench,
  Package,
  Camera,
  Star,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronRight,
  FileText,
  DollarSign,
  ClipboardList,
} from "lucide-react";

interface ServiceHistoryViewerProps {
  vesselId: Id<"vessels">;
  vesselName: string;
  onClose: () => void;
}

export function ServiceHistoryViewer({
  vesselId,
  vesselName,
  onClose,
}: ServiceHistoryViewerProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<Id<"workOrders"> | null>(null);
  
  const workOrders = useQuery(api.workOrders.getVesselWorkOrders, { vesselId }) ?? [];
  const selectedOrder = useQuery(
    api.workOrders.getWorkOrder,
    selectedOrderId ? { workOrderId: selectedOrderId } : "skip"
  );

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (timestamp: number | undefined) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
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

  // Stats
  const completedCount = workOrders.filter((wo) => wo.status === "completed").length;
  const inProgressCount = workOrders.filter((wo) => wo.status === "in_progress").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-captain-600 to-captain-700 px-6 py-5 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Service History</h2>
                <p className="text-captain-100">{vesselName}</p>
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

        {/* Stats Bar */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-6 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-8 h-8 bg-captain-100 rounded-lg flex items-center justify-center">
              <FileText size={16} className="text-captain-600" />
            </div>
            <div>
              <span className="font-semibold text-gray-900">{workOrders.length}</span>
              <span className="text-gray-500 ml-1">Total Records</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle size={16} className="text-green-600" />
            </div>
            <div>
              <span className="font-semibold text-gray-900">{completedCount}</span>
              <span className="text-gray-500 ml-1">Completed</span>
            </div>
          </div>
          {inProgressCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock size={16} className="text-amber-600" />
              </div>
              <div>
                <span className="font-semibold text-amber-600">{inProgressCount}</span>
                <span className="text-gray-500 ml-1">In Progress</span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedOrderId && selectedOrder ? (
            // Work Order Detail View
            <WorkOrderDetailView
              order={selectedOrder}
              onBack={() => setSelectedOrderId(null)}
              formatDate={formatDate}
              formatDateTime={formatDateTime}
              formatCurrency={formatCurrency}
            />
          ) : (
            // Work Orders List View
            <div className="animate-fadeIn">
              {workOrders.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <ClipboardList size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-600 font-medium mb-1">No service history yet</p>
                  <p className="text-sm text-gray-500">
                    Work orders completed on this vessel will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workOrders.map((order) => (
                    <div
                      key={order._id}
                      onClick={() => setSelectedOrderId(order._id)}
                      className="bg-white border border-gray-200 rounded-xl p-4 hover:border-captain-300 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Status and Date */}
                          <div className="flex items-center gap-2 mb-2">
                            <StatusBadge status={order.status} />
                            <span className="text-xs text-gray-500">
                              {formatDate(order.startedAt)}
                            </span>
                          </div>
                          
                          {/* Description */}
                          <h4 className="font-medium text-gray-900 mb-1 line-clamp-2">
                            {order.description}
                          </h4>
                          
                          {/* Mechanic Info */}
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <User size={14} />
                              <span>{order.mechanicName || "Unknown"}</span>
                            </div>
                            {order.mechanicCompany && (
                              <div className="flex items-center gap-1">
                                <Building2 size={14} />
                                <span>{order.mechanicCompany}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Work Performed Preview */}
                          {order.workPerformed && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                              {order.workPerformed}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {order.totalCost && (
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(order.totalCost)}
                            </span>
                          )}
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-captain-50 transition-colors">
                            <ChevronRight
                              size={18}
                              className="text-gray-400 group-hover:text-captain-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: "in_progress" | "completed" | "cancelled" }) {
  const config = {
    in_progress: {
      label: "In Progress",
      className: "bg-amber-100 text-amber-700",
      icon: Clock,
    },
    completed: {
      label: "Completed",
      className: "bg-green-100 text-green-700",
      icon: CheckCircle,
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-gray-100 text-gray-600",
      icon: XCircle,
    },
  };

  const { label, className, icon: Icon } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}

// Work Order Detail View
interface WorkOrderDetailViewProps {
  order: NonNullable<ReturnType<typeof useQuery<typeof api.workOrders.getWorkOrder>>>;
  onBack: () => void;
  formatDate: (timestamp: number | undefined) => string;
  formatDateTime: (timestamp: number | undefined) => string;
  formatCurrency: (amount: number | undefined) => string;
}

function WorkOrderDetailView({
  order,
  onBack,
  formatDate,
  formatDateTime,
  formatCurrency,
}: WorkOrderDetailViewProps) {
  return (
    <div className="animate-fadeIn">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-3 py-1.5 mb-4 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-captain-300 hover:text-captain-600 transition-all"
      >
        <ArrowLeft size={16} />
        Back to History
      </button>

      {/* Header Card */}
      <div className="bg-gradient-to-br from-captain-50 to-captain-100 border border-captain-200 rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={order.status} />
              {order.rating && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                  <Star size={12} fill="currentColor" />
                  {order.rating.rating}/5
                </div>
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{order.description}</h3>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>Started: {formatDate(order.startedAt)}</span>
              </div>
              {order.completedAt && (
                <div className="flex items-center gap-1">
                  <CheckCircle size={14} />
                  <span>Completed: {formatDate(order.completedAt)}</span>
                </div>
              )}
            </div>
          </div>
          {order.totalCost !== undefined && (
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-0.5">Total Cost</div>
              <div className="text-xl font-bold text-captain-700">
                {formatCurrency(order.totalCost)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Mechanic Info */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <User size={16} />
            Mechanic
          </h4>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-captain-100 rounded-full flex items-center justify-center">
              <Wrench size={20} className="text-captain-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">
                {order.mechanic?.name || "Unknown"}
              </div>
              {order.mechanic?.company && (
                <div className="text-sm text-gray-500">{order.mechanic.company}</div>
              )}
              {order.mechanic?.phone && (
                <div className="text-sm text-gray-500">{order.mechanic.phone}</div>
              )}
            </div>
          </div>
        </div>

        {/* Diagnosis */}
        {order.diagnosis && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <AlertCircle size={16} />
              Diagnosis
            </h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{order.diagnosis}</p>
          </div>
        )}

        {/* Work Performed */}
        {order.workPerformed && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Wrench size={16} />
              Work Performed
            </h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{order.workPerformed}</p>
          </div>
        )}

        {/* Labor & Cost */}
        {(order.laborHours || order.laborRate || order.totalCost) && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign size={16} />
              Labor & Cost
            </h4>
            <div className="grid grid-cols-3 gap-4">
              {order.laborHours !== undefined && (
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Hours</div>
                  <div className="font-medium text-gray-900">{order.laborHours} hrs</div>
                </div>
              )}
              {order.laborRate !== undefined && (
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Rate</div>
                  <div className="font-medium text-gray-900">{formatCurrency(order.laborRate)}/hr</div>
                </div>
              )}
              {order.totalCost !== undefined && (
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Total</div>
                  <div className="font-bold text-captain-700">{formatCurrency(order.totalCost)}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Parts Used */}
        {order.parts && order.parts.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package size={16} />
              Parts Used ({order.parts.length})
            </h4>
            <div className="space-y-2">
              {order.parts.map((part) => (
                <div
                  key={part._id}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{part.name}</div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {part.partNumber && <span>P/N: {part.partNumber}</span>}
                      {part.manufacturer && <span>{part.manufacturer}</span>}
                      <span>Qty: {part.quantity}</span>
                    </div>
                    {part.warrantyExpiry && (
                      <div className="text-xs text-green-600 mt-0.5">
                        Warranty until {formatDate(part.warrantyExpiry)}
                      </div>
                    )}
                  </div>
                  {part.unitCost !== undefined && (
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(part.unitCost * part.quantity)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photos */}
        {order.photos && order.photos.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Camera size={16} />
              Photos ({order.photos.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {order.photos.map((photo) => (
                <div key={photo._id} className="relative group">
                  {photo.url ? (
                    <img
                      src={photo.url}
                      alt={photo.caption || "Work photo"}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                      <Camera size={24} className="text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        photo.photoType === "before"
                          ? "bg-blue-100 text-blue-700"
                          : photo.photoType === "during"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {photo.photoType.charAt(0).toUpperCase() + photo.photoType.slice(1)}
                    </span>
                  </div>
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 rounded-b-lg">
                      <p className="text-xs text-white truncate">{photo.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rating & Review */}
        {order.rating && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Star size={16} />
              Customer Review
            </h4>
            <div className="flex items-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={20}
                  className={
                    star <= order.rating!.rating
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300"
                  }
                />
              ))}
              <span className="ml-2 font-medium text-gray-900">
                {order.rating.rating}/5
              </span>
            </div>
            {order.rating.review && (
              <p className="text-sm text-gray-600 italic">"{order.rating.review}"</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ServiceHistoryViewer;
