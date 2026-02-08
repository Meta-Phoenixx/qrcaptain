"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { GlassModal } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";
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
  Settings,
  Zap,
  Battery,
  Droplets,
  Fuel,
  Target,
  Snowflake,
  Thermometer,
  Ship,
  Compass,
  MapPin,
  Search,
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
  const { mode } = useTheme();
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
    <GlassModal onClose={onClose} className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-5 flex-shrink-0 ${mode === 'dark' ? "bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border-b border-white/10" : "bg-gradient-to-r from-captain-600 to-captain-700 text-white"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mode === 'dark' ? "bg-white/10" : "bg-white/20"}`}>
                <ClipboardList className={`w-6 h-6 ${mode === 'dark' ? "text-white" : ""}`} />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${mode === 'dark' ? "text-white" : ""}`}>Service History</h2>
                <p className={`${mode === 'dark' ? "text-gray-300" : "text-captain-100"}`}>{vesselName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${mode === 'dark' ? "hover:bg-white/10 text-gray-300 hover:text-white" : "hover:bg-white/10"}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className={`px-6 py-3 border-b flex items-center gap-6 flex-shrink-0 ${mode === 'dark' ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"}`}>
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mode === 'dark' ? "bg-blue-900/20" : "bg-captain-100"}`}>
              <FileText size={16} className={`${mode === 'dark' ? "text-blue-400" : "text-captain-600"}`} />
            </div>
            <div>
              <span className={`font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{workOrders.length}</span>
              <span className={`ml-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Total Records</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mode === 'dark' ? "bg-green-900/20" : "bg-green-100"}`}>
              <CheckCircle size={16} className={`${mode === 'dark' ? "text-green-400" : "text-green-600"}`} />
            </div>
            <div>
              <span className={`font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{completedCount}</span>
              <span className={`ml-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Completed</span>
            </div>
          </div>
          {inProgressCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mode === 'dark' ? "bg-amber-900/20" : "bg-amber-100"}`}>
                <Clock size={16} className={`${mode === 'dark' ? "text-amber-400" : "text-amber-600"}`} />
              </div>
              <div>
                <span className={`font-semibold ${mode === 'dark' ? "text-amber-400" : "text-amber-600"}`}>{inProgressCount}</span>
                <span className={`ml-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>In Progress</span>
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
            <div className="animate-fadeIn space-y-6">
              {workOrders.length === 0 ? (
                <div className={`text-center py-12 rounded-xl ${mode === 'dark' ? "bg-white/5" : "bg-gray-50"}`}>
                  <ClipboardList size={48} className={`mx-auto mb-3 ${mode === 'dark' ? "text-gray-600" : "text-gray-300"}`} />
                  <p className={`font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-600"}`}>No service history yet</p>
                  <p className={`text-sm ${mode === 'dark' ? "text-gray-500" : "text-gray-500"}`}>
                    Work orders completed on this vessel will appear here.
                  </p>
                </div>
              ) : (
                <>
                  {/* In Progress Work Orders - Featured Widget */}
                  {workOrders.filter(wo => wo.status === "in_progress").length > 0 && (
                    <div className="space-y-3">
                      <h3 className={`text-sm font-semibold uppercase tracking-wide flex items-center gap-2 ${mode === 'dark' ? "text-amber-400" : "text-amber-700"}`}>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                        Active Work In Progress
                      </h3>
                      {workOrders.filter(wo => wo.status === "in_progress").map((order) => (
                        <InProgressWidget 
                          key={order._id} 
                          order={order}
                          formatDate={formatDate}
                          onClick={() => setSelectedOrderId(order._id)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Completed Work Orders */}
                  {workOrders.filter(wo => wo.status !== "in_progress").length > 0 && (
                    <div className="space-y-3">
                      {workOrders.filter(wo => wo.status === "in_progress").length > 0 && (
                        <h3 className={`text-sm font-semibold uppercase tracking-wide ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                          Service History
                        </h3>
                      )}
                      {workOrders.filter(wo => wo.status !== "in_progress").map((order) => (
                        <div
                          key={order._id}
                          onClick={() => setSelectedOrderId(order._id)}
                          className={`border rounded-xl p-4 transition-all cursor-pointer group ${mode === 'dark' ? "bg-white/5 border-white/10 hover:border-blue-500/50 hover:bg-white/10" : "bg-white border-gray-200 hover:border-captain-300 hover:shadow-md"}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              {/* Status and Date */}
                              <div className="flex items-center gap-2 mb-2">
                                <StatusBadge status={order.status} />
                                <span className={`text-xs ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                                  {formatDate(order.startedAt)}
                                </span>
                              </div>
                              
                              {/* Description */}
                              <h4 className={`font-medium mb-1 line-clamp-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
                                {order.description}
                              </h4>
                              
                              {/* Mechanic Info */}
                              <div className={`flex items-center gap-3 text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
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
                                <p className={`text-sm mt-2 line-clamp-2 ${mode === 'dark' ? "text-gray-300" : "text-gray-600"}`}>
                                  {order.workPerformed}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {order.totalCost && (
                                <span className={`text-sm font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
                                  {formatCurrency(order.totalCost)}
                                </span>
                              )}
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${mode === 'dark' ? "bg-white/10 group-hover:bg-white/20" : "bg-gray-100 group-hover:bg-captain-50"}`}>
                                <ChevronRight
                                  size={18}
                                  className={`${mode === 'dark' ? "text-gray-400 group-hover:text-white" : "text-gray-400 group-hover:text-captain-500"}`}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`border-t px-6 py-4 flex-shrink-0 ${mode === 'dark' ? "border-white/10" : "border-gray-200"}`}>
          <button
            onClick={onClose}
            className={`w-full py-2.5 rounded-xl font-medium transition-colors ${mode === 'dark' ? "bg-white/10 text-gray-200 hover:bg-white/20" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            Close
          </button>
        </div>
    </GlassModal>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
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

  const { label, className, icon: Icon } = config[status as keyof typeof config] || config.completed;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}

// In Progress Widget - Featured card for active work orders
interface InProgressWidgetProps {
  order: {
    _id: Id<"workOrders">;
    description: string;
    status: string;
    startedAt: number;
    mechanicName?: string;
    mechanicCompany?: string;
    diagnosis?: string;
  };
  formatDate: (timestamp: number | undefined) => string;
  onClick: () => void;
}

function InProgressWidget({ order, formatDate, onClick }: InProgressWidgetProps) {
  const { mode } = useTheme();
  // Calculate time elapsed
  const startDate = new Date(order.startedAt);
  const now = new Date();
  const daysElapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const hoursElapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60));
  
  let timeLabel = "";
  if (daysElapsed > 0) {
    timeLabel = `${daysElapsed} day${daysElapsed > 1 ? "s" : ""} in progress`;
  } else if (hoursElapsed > 0) {
    timeLabel = `${hoursElapsed} hour${hoursElapsed > 1 ? "s" : ""} in progress`;
  } else {
    timeLabel = "Just started";
  }

  // Try to extract category from description (common keywords)
  const categoryKeywords: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    engine: { label: "Engine", icon: <Settings className="w-3.5 h-3.5" />, color: "bg-red-100 text-red-700" },
    motor: { label: "Engine", icon: <Settings className="w-3.5 h-3.5" />, color: "bg-red-100 text-red-700" },
    electrical: { label: "Electrical", icon: <Zap className="w-3.5 h-3.5" />, color: "bg-yellow-100 text-yellow-700" },
    wiring: { label: "Electrical", icon: <Zap className="w-3.5 h-3.5" />, color: "bg-yellow-100 text-yellow-700" },
    battery: { label: "Electrical", icon: <Battery className="w-3.5 h-3.5" />, color: "bg-yellow-100 text-yellow-700" },
    plumbing: { label: "Plumbing", icon: <Wrench className="w-3.5 h-3.5" />, color: "bg-blue-100 text-blue-700" },
    leak: { label: "Plumbing", icon: <Droplets className="w-3.5 h-3.5" />, color: "bg-blue-100 text-blue-700" },
    fuel: { label: "Fuel System", icon: <Fuel className="w-3.5 h-3.5" />, color: "bg-orange-100 text-orange-700" },
    steering: { label: "Steering", icon: <Target className="w-3.5 h-3.5" />, color: "bg-purple-100 text-purple-700" },
    cooling: { label: "Cooling", icon: <Snowflake className="w-3.5 h-3.5" />, color: "bg-cyan-100 text-cyan-700" },
    hvac: { label: "HVAC", icon: <Thermometer className="w-3.5 h-3.5" />, color: "bg-teal-100 text-teal-700" },
    hull: { label: "Hull", icon: <Ship className="w-3.5 h-3.5" />, color: "bg-indigo-100 text-indigo-700" },
    navigation: { label: "Navigation", icon: <Compass className="w-3.5 h-3.5" />, color: "bg-emerald-100 text-emerald-700" },
    gps: { label: "Navigation", icon: <MapPin className="w-3.5 h-3.5" />, color: "bg-emerald-100 text-emerald-700" },
    inspection: { label: "Inspection", icon: <Search className="w-3.5 h-3.5" />, color: "bg-gray-100 text-gray-700" },
    maintenance: { label: "Maintenance", icon: <Wrench className="w-3.5 h-3.5" />, color: "bg-slate-100 text-slate-700" },
    oil: { label: "Maintenance", icon: <Droplets className="w-3.5 h-3.5" />, color: "bg-amber-100 text-amber-700" },
  };

  let category: { label: string; icon: React.ReactNode; color: string } = { label: "General Service", icon: <Wrench className="w-3.5 h-3.5" />, color: "bg-gray-100 text-gray-700" };
  const descLower = order.description.toLowerCase();
  for (const [keyword, cat] of Object.entries(categoryKeywords)) {
    if (descLower.includes(keyword)) {
      category = cat;
      break;
    }
  }

  return (
    <div
      onClick={onClick}
      className={`border-2 rounded-xl p-4 transition-all cursor-pointer group hover:shadow-lg ${mode === 'dark' ? "bg-amber-900/20 border-amber-500/30 hover:border-amber-500/50" : "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300 hover:border-amber-400"}`}
    >
      {/* Top Row - Category & Time */}
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${category.color}`}>
          <span>{category.icon}</span>
          {category.label}
        </span>
        <div className={`flex items-center gap-1.5 text-xs ${mode === 'dark' ? "text-amber-400" : "text-amber-700"}`}>
          <Clock size={14} />
          <span className="font-medium">{timeLabel}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Description */}
          <h4 className={`font-semibold mb-2 line-clamp-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
            {order.description}
          </h4>
          
          {/* Mechanic Info */}
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-amber-500/20" : "bg-amber-200"}`}>
              <Wrench size={14} className={`${mode === 'dark' ? "text-amber-400" : "text-amber-700"}`} />
            </div>
            <div>
              <div className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{order.mechanicName || "Unknown"}</div>
              {order.mechanicCompany && (
                <div className={`text-xs ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{order.mechanicCompany}</div>
              )}
            </div>
          </div>

          {/* Started Date */}
          <div className={`flex items-center gap-1.5 mt-3 text-xs ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
            <Calendar size={12} />
            <span>Started {formatDate(order.startedAt)}</span>
          </div>
        </div>

        {/* Right Side - Click Indicator */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${mode === 'dark' ? "bg-amber-500/20 group-hover:bg-amber-500/30" : "bg-amber-200 group-hover:bg-amber-300"}`}>
            <ChevronRight size={20} className={`${mode === 'dark' ? "text-amber-400" : "text-amber-700"}`} />
          </div>
          <span className={`text-xs font-medium ${mode === 'dark' ? "text-amber-400" : "text-amber-600"}`}>View Details</span>
        </div>
      </div>

      {/* Bottom - Status Bar */}
      <div className={`mt-4 pt-3 border-t ${mode === 'dark' ? "border-amber-500/20" : "border-amber-200"}`}>
        <div className="flex items-center justify-between text-xs">
          <span className={`font-medium ${mode === 'dark' ? "text-amber-400" : "text-amber-700"}`}>Work in progress...</span>
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-semibold ${mode === 'dark' ? "bg-amber-500/20 text-amber-300" : "bg-amber-200 text-amber-800"}`}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-600 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-600"></span>
            </span>
            Live
          </span>
        </div>
      </div>
    </div>
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
  const { mode } = useTheme();
  const isInProgress = order.status === "in_progress";
  
  // Calculate elapsed time for in-progress orders
  let elapsedLabel = "";
  if (isInProgress && order.startedAt) {
    const startDate = new Date(order.startedAt);
    const now = new Date();
    const daysElapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const hoursElapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60));
    
    if (daysElapsed > 0) {
      elapsedLabel = `${daysElapsed} day${daysElapsed > 1 ? "s" : ""} elapsed`;
    } else if (hoursElapsed > 0) {
      elapsedLabel = `${hoursElapsed} hour${hoursElapsed > 1 ? "s" : ""} elapsed`;
    } else {
      elapsedLabel = "Started recently";
    }
  }

  return (
    <div className="animate-fadeIn">
      {/* Back button */}
      <button
        onClick={onBack}
        className={`flex items-center gap-2 px-3 py-1.5 mb-4 text-sm font-medium border rounded-lg transition-all ${
          mode === 'dark' 
            ? "text-gray-300 bg-white/5 border-white/10 hover:border-blue-500/50 hover:text-white" 
            : "text-gray-600 bg-white border-gray-200 hover:border-captain-300 hover:text-captain-600"
        }`}
      >
        <ArrowLeft size={16} />
        Back to History
      </button>

      {/* Header Card - Different style for in-progress */}
      {isInProgress ? (
        <div className={`border-2 rounded-xl p-5 mb-4 ${mode === 'dark' ? "bg-amber-900/20 border-amber-500/30" : "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${mode === 'dark' ? "bg-amber-600 text-white" : "bg-amber-500 text-white"}`}>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  In Progress
                </span>
                <span className={`text-xs font-medium ${mode === 'dark' ? "text-amber-400" : "text-amber-700"}`}>{elapsedLabel}</span>
              </div>
              <h3 className={`text-lg font-bold mb-1 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{order.description}</h3>
              <div className={`flex items-center gap-4 text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>Started: {formatDate(order.startedAt)}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`px-3 py-2 rounded-lg ${mode === 'dark' ? "bg-amber-900/30" : "bg-amber-200"}`}>
                <div className={`text-xs mb-0.5 font-medium ${mode === 'dark' ? "text-amber-400" : "text-amber-700"}`}>Status</div>
                <div className={`text-sm font-bold ${mode === 'dark' ? "text-amber-300" : "text-amber-800"}`}>Work in Progress</div>
              </div>
            </div>
          </div>
          
          {/* Progress Notice */}
          <div className={`mt-4 p-3 border rounded-lg ${mode === 'dark' ? "bg-amber-900/10 border-amber-500/20" : "bg-white/50 border-amber-200"}`}>
            <p className={`text-sm ${mode === 'dark' ? "text-amber-300" : "text-amber-800"}`}>
              <span className="font-semibold">Note:</span> This work order is currently active. The mechanic is still working on your vessel and information below reflects what has been entered so far.
            </p>
          </div>
        </div>
      ) : (
        <div className={`border rounded-xl p-5 mb-4 ${mode === 'dark' ? "bg-blue-900/20 border-white/10" : "bg-gradient-to-br from-captain-50 to-captain-100 border-captain-200"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status={order.status} />
                {order.rating && (
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${mode === 'dark' ? "bg-yellow-900/30 text-yellow-400" : "bg-yellow-100 text-yellow-700"}`}>
                    <Star size={12} fill="currentColor" />
                    {order.rating.rating}/5
                  </div>
                )}
              </div>
              <h3 className={`text-lg font-bold mb-1 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{order.description}</h3>
              <div className={`flex items-center gap-4 text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>
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
                <div className={`text-xs mb-0.5 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Total Cost</div>
                <div className={`text-xl font-bold ${mode === 'dark' ? "text-blue-400" : "text-captain-700"}`}>
                  {formatCurrency(order.totalCost)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Mechanic Info - with contact info for in-progress */}
        <div className={`border rounded-xl p-4 ${isInProgress ? (mode === 'dark' ? 'bg-amber-900/10 border-amber-500/20' : 'bg-white border-amber-200') : (mode === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200')}`}>
          <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
            <User size={16} />
            {isInProgress ? "Assigned Mechanic" : "Mechanic"}
          </h4>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isInProgress ? (mode === 'dark' ? 'bg-amber-500/20' : 'bg-amber-100') : (mode === 'dark' ? 'bg-blue-500/20' : 'bg-captain-100')}`}>
              <Wrench size={20} className={isInProgress ? (mode === 'dark' ? 'text-amber-400' : 'text-amber-600') : (mode === 'dark' ? 'text-blue-400' : 'text-captain-600')} />
            </div>
            <div>
              <div className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
                {order.mechanic?.name || "Unknown"}
              </div>
              {order.mechanic?.company && (
                <div className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{order.mechanic.company}</div>
              )}
              {order.mechanic?.phone && (
                <div className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{order.mechanic.phone}</div>
              )}
            </div>
          </div>
          {isInProgress && order.mechanic?.phone && (
            <div className={`mt-3 pt-3 border-t ${mode === 'dark' ? "border-white/10" : "border-gray-100"}`}>
              <p className={`text-xs ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                Contact the mechanic directly if you have questions about the ongoing work.
              </p>
            </div>
          )}
        </div>

        {/* Diagnosis - with "entered so far" for in-progress */}
        {isInProgress ? (
          <div className={`border rounded-xl p-4 ${mode === 'dark' ? "bg-white/5 border-amber-500/30" : "bg-white border-amber-200"}`}>
            <h4 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
              <AlertCircle size={16} className={`${mode === 'dark' ? "text-amber-400" : "text-amber-600"}`} />
              Initial Diagnosis
              <span className={`text-xs font-normal ${mode === 'dark' ? "text-amber-400" : "text-amber-600"}`}>(entered so far)</span>
            </h4>
            {order.diagnosis ? (
              <p className={`text-sm whitespace-pre-wrap ${mode === 'dark' ? "text-gray-300" : "text-gray-600"}`}>{order.diagnosis}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">No diagnosis entered yet</p>
            )}
          </div>
        ) : order.diagnosis && (
          <div className={`border rounded-xl p-4 ${mode === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}>
            <h4 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
              <AlertCircle size={16} />
              Diagnosis
            </h4>
            <p className={`text-sm whitespace-pre-wrap ${mode === 'dark' ? "text-gray-300" : "text-gray-600"}`}>{order.diagnosis}</p>
          </div>
        )}

        {/* Work Performed - with "entered so far" for in-progress */}
        {isInProgress ? (
          <div className={`border rounded-xl p-4 ${mode === 'dark' ? "bg-white/5 border-amber-500/30" : "bg-white border-amber-200"}`}>
            <h4 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
              <Wrench size={16} className={`${mode === 'dark' ? "text-amber-400" : "text-amber-600"}`} />
              Work Performed
              <span className={`text-xs font-normal ${mode === 'dark' ? "text-amber-400" : "text-amber-600"}`}>(entered so far)</span>
            </h4>
            {order.workPerformed ? (
              <p className={`text-sm whitespace-pre-wrap ${mode === 'dark' ? "text-gray-300" : "text-gray-600"}`}>{order.workPerformed}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">No work notes entered yet</p>
            )}
          </div>
        ) : order.workPerformed && (
          <div className={`border rounded-xl p-4 ${mode === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}>
            <h4 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
              <Wrench size={16} />
              Work Performed
            </h4>
            <p className={`text-sm whitespace-pre-wrap ${mode === 'dark' ? "text-gray-300" : "text-gray-600"}`}>{order.workPerformed}</p>
          </div>
        )}

        {/* Labor & Cost */}
        {isInProgress ? (
          <div className={`border rounded-xl p-4 ${mode === 'dark' ? "bg-white/5 border-amber-500/30" : "bg-white border-amber-200"}`}>
            <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
              <DollarSign size={16} className={`${mode === 'dark' ? "text-amber-400" : "text-amber-600"}`} />
              Estimated Cost
              <span className={`text-xs font-normal ${mode === 'dark' ? "text-amber-400" : "text-amber-600"}`}>(preliminary)</span>
            </h4>
            <div className="grid grid-cols-3 gap-4">
              {order.laborHours !== undefined && (
                <div>
                  <div className={`text-xs mb-0.5 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Est. Hours</div>
                  <div className={`font-medium ${mode === 'dark' ? "text-amber-400" : "text-amber-700"}`}>{order.laborHours} hrs</div>
                </div>
              )}
              {order.laborRate !== undefined && (
                <div>
                  <div className={`text-xs mb-0.5 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Rate</div>
                  <div className={`font-medium ${mode === 'dark' ? "text-amber-400" : "text-amber-700"}`}>{formatCurrency(order.laborRate)}/hr</div>
                </div>
              )}
              <div>
                <div className={`text-xs mb-0.5 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Running Total</div>
                <div className={`font-bold ${mode === 'dark' ? "text-amber-400" : "text-amber-700"}`}>
                  {order.totalCost !== undefined ? formatCurrency(order.totalCost) : "—"}
                </div>
              </div>
            </div>
            <p className={`text-xs mt-3 italic ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
              Final cost will be provided when the work order is completed.
            </p>
          </div>
        ) : (order.laborHours || order.laborRate || order.totalCost) && (
          <div className={`border rounded-xl p-4 ${mode === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}>
            <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
              <DollarSign size={16} />
              Labor & Cost
            </h4>
            <div className="grid grid-cols-3 gap-4">
              {order.laborHours !== undefined && (
                <div>
                  <div className={`text-xs mb-0.5 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Hours</div>
                  <div className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{order.laborHours} hrs</div>
                </div>
              )}
              {order.laborRate !== undefined && (
                <div>
                  <div className={`text-xs mb-0.5 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Rate</div>
                  <div className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{formatCurrency(order.laborRate)}/hr</div>
                </div>
              )}
              {order.totalCost !== undefined && (
                <div>
                  <div className={`text-xs mb-0.5 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Total</div>
                  <div className={`font-bold ${mode === 'dark' ? "text-blue-400" : "text-captain-700"}`}>{formatCurrency(order.totalCost)}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Parts Used - with "entered so far" for in-progress */}
        {isInProgress ? (
          <div className={`border rounded-xl p-4 ${mode === 'dark' ? "bg-white/5 border-amber-500/30" : "bg-white border-amber-200"}`}>
            <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
              <Package size={16} className={`${mode === 'dark' ? "text-amber-400" : "text-amber-600"}`} />
              Parts Added
              <span className={`text-xs font-normal ${mode === 'dark' ? "text-amber-400" : "text-amber-600"}`}>(so far: {order.parts?.length || 0})</span>
            </h4>
            {order.parts && order.parts.length > 0 ? (
              <div className="space-y-2">
                {order.parts.map((part) => (
                  <div
                    key={part._id}
                    className={`flex items-center justify-between py-2 px-3 rounded-lg border ${mode === 'dark' ? "bg-amber-900/10 border-amber-500/20" : "bg-amber-50 border-amber-100"}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{part.name}</div>
                      <div className={`flex items-center gap-3 text-xs ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                        {part.partNumber && <span>P/N: {part.partNumber}</span>}
                        {part.manufacturer && <span>{part.manufacturer}</span>}
                        <span>Qty: {part.quantity}</span>
                      </div>
                      {part.warrantyExpiry && (
                        <div className={`text-xs mt-0.5 ${mode === 'dark' ? "text-green-400" : "text-green-600"}`}>
                          Warranty until {formatDate(part.warrantyExpiry)}
                        </div>
                      )}
                    </div>
                    {part.unitCost !== undefined && (
                      <div className={`text-sm font-medium ${mode === 'dark' ? "text-amber-400" : "text-amber-700"}`}>
                        {formatCurrency(part.unitCost * part.quantity)}
                      </div>
                    )}
                  </div>
                ))}
                {/* Running total for in-progress */}
                <div className={`mt-3 pt-3 border-t flex justify-between items-center ${mode === 'dark' ? "border-white/10" : "border-amber-200"}`}>
                  <span className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>Parts subtotal (so far)</span>
                  <span className={`font-semibold ${mode === 'dark' ? "text-amber-400" : "text-amber-700"}`}>
                    {formatCurrency(order.parts.reduce((sum, p) => sum + (p.unitCost || 0) * p.quantity, 0))}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No parts added yet</p>
            )}
          </div>
        ) : order.parts && order.parts.length > 0 && (
          <div className={`border rounded-xl p-4 ${mode === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}>
            <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
              <Package size={16} />
              Parts Used ({order.parts.length})
            </h4>
            <div className="space-y-2">
              {order.parts.map((part) => (
                <div
                  key={part._id}
                  className={`flex items-center justify-between py-2 px-3 rounded-lg ${mode === 'dark' ? "bg-white/5" : "bg-gray-50"}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{part.name}</div>
                    <div className={`flex items-center gap-3 text-xs ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                      {part.partNumber && <span>P/N: {part.partNumber}</span>}
                      {part.manufacturer && <span>{part.manufacturer}</span>}
                      <span>Qty: {part.quantity}</span>
                    </div>
                    {part.warrantyExpiry && (
                      <div className={`text-xs mt-0.5 ${mode === 'dark' ? "text-green-400" : "text-green-600"}`}>
                        Warranty until {formatDate(part.warrantyExpiry)}
                      </div>
                    )}
                  </div>
                  {part.unitCost !== undefined && (
                    <div className={`text-sm font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
                      {formatCurrency(part.unitCost * part.quantity)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photos - with "entered so far" for in-progress */}
        {isInProgress ? (
          <div className={`border rounded-xl p-4 ${mode === 'dark' ? "bg-white/5 border-amber-500/30" : "bg-white border-amber-200"}`}>
            <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
              <Camera size={16} className={`${mode === 'dark' ? "text-amber-400" : "text-amber-600"}`} />
              Work Photos
              <span className={`text-xs font-normal ${mode === 'dark' ? "text-amber-400" : "text-amber-600"}`}>(so far: {order.photos?.length || 0})</span>
            </h4>
            {order.photos && order.photos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {order.photos.map((photo) => (
                  <div key={photo._id} className="relative group">
                    {photo.url ? (
                      <img
                        src={photo.url}
                        alt={photo.caption || "Work photo"}
                        className={`w-full aspect-square object-cover rounded-lg border-2 ${mode === 'dark' ? "border-amber-500/30" : "border-amber-200"}`}
                      />
                    ) : (
                      <div className={`w-full aspect-square rounded-lg flex items-center justify-center border-2 ${mode === 'dark' ? "bg-white/5 border-amber-500/30" : "bg-amber-50 border-amber-200"}`}>
                        <Camera size={24} className={`${mode === 'dark' ? "text-amber-400" : "text-amber-400"}`} />
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
            ) : (
              <p className="text-sm text-gray-400 italic">No photos added yet</p>
            )}
          </div>
        ) : order.photos && order.photos.length > 0 && (
          <div className={`border rounded-xl p-4 ${mode === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}>
            <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
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
                    <div className={`w-full aspect-square rounded-lg flex items-center justify-center ${mode === 'dark' ? "bg-white/5" : "bg-gray-100"}`}>
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

        {/* Rating & Review - Only for completed orders */}
        {!isInProgress && order.rating && (
          <div className={`border rounded-xl p-4 ${mode === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}>
            <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
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
              <span className={`ml-2 font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
                {order.rating.rating}/5
              </span>
            </div>
            {order.rating.review && (
              <p className={`text-sm italic ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>"{order.rating.review}"</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ServiceHistoryViewer;
