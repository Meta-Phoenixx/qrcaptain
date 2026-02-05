"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import {
  Settings,
  Zap,
  Compass,
  Droplets,
  Fuel,
  Wind,
  Anchor,
  ShieldAlert,
  Gauge,
  Ship,
  Tent,
  UtensilsCrossed,
  Music,
  Cable,
  Waves,
  Search,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  LucideIcon,
  Calendar,
  Clock,
  Wrench,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Package,
  Info,
  LayoutGrid,
  List,
} from "lucide-react";

// Type for equipment item from the database
type EquipmentItem = Doc<"vesselEquipment"> & { imageUrl: string | null };

// Color system
const COLORS = {
  background: "#FFFFFF",
  backgroundAlt: "#F8F9FA",
  textPrimary: "#1A1D29",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  iconDefault: "#6B7280",
  border: "#E5E7EB",
  borderHover: "#D1D5DB",
  blueHighlight: "#4A9EFF",
  blueHighlightDim: "rgba(74, 158, 255, 0.1)",
  cardBg: "#FFFFFF",
  cardBgHover: "#F9FAFB",
};

// Equipment category definitions with icons
interface CategoryDefinition {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
}

const EQUIPMENT_CATEGORIES: CategoryDefinition[] = [
  { id: "propulsion", name: "Propulsion", icon: Settings, description: "Engines, motors, propellers" },
  { id: "electrical", name: "Electrical", icon: Zap, description: "Batteries, generators, solar" },
  { id: "electronics", name: "Navigation", icon: Compass, description: "GPS, radar, radios" },
  { id: "plumbing", name: "Plumbing", icon: Droplets, description: "Water systems, pumps" },
  { id: "fuel", name: "Fuel", icon: Fuel, description: "Tanks, filters, lines" },
  { id: "hvac", name: "Climate", icon: Wind, description: "AC, heating, ventilation" },
  { id: "deck", name: "Deck", icon: Anchor, description: "Windlass, anchors, winches" },
  { id: "safety", name: "Safety", icon: ShieldAlert, description: "Life jackets, fire extinguishers" },
  { id: "steering", name: "Steering", icon: Gauge, description: "Hydraulics, rudders, trim tabs" },
  { id: "hull", name: "Hull", icon: Ship, description: "Anti-fouling, zincs, thru-hulls" },
  { id: "canvas", name: "Canvas", icon: Tent, description: "Bimini, covers, enclosures" },
  { id: "galley", name: "Galley", icon: UtensilsCrossed, description: "Stove, refrigerator" },
  { id: "entertainment", name: "Entertainment", icon: Music, description: "Stereo, speakers, TV" },
  { id: "rigging", name: "Rigging", icon: Cable, description: "Mast, boom, sails" },
  { id: "tender", name: "Tender", icon: Waves, description: "Dinghy, water toys" },
];

interface ManifestViewerProps {
  vesselId: Id<"vessels">;
  vesselName: string;
  onClose: () => void;
}

type ViewMode = "categories" | "list";

export function ManifestViewer({ vesselId, vesselName, onClose }: ManifestViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("categories");
  const [selectedCategory, setSelectedCategory] = useState<CategoryDefinition | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null); // For category view popup
  const [listViewEquipment, setListViewEquipment] = useState<EquipmentItem | null>(null); // For list view inline detail
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Fetch equipment data from Convex
  const equipment = useQuery(api.vesselEquipment.listByVessel, { vesselId }) ?? [];
  const categoryCounts = useQuery(api.vesselEquipment.getCategoryCounts, { vesselId }) ?? {};

  // Toggle category expansion in list view
  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Expand all categories
  const expandAllCategories = () => {
    setExpandedCategories(new Set(EQUIPMENT_CATEGORIES.map(c => c.id)));
  };

  // Collapse all categories
  const collapseAllCategories = () => {
    setExpandedCategories(new Set());
  };

  // Build categories with actual item counts
  const categoriesWithCounts = useMemo(() => {
    return EQUIPMENT_CATEGORIES.map((cat) => ({
      ...cat,
      itemCount: categoryCounts[cat.id] || 0,
    }));
  }, [categoryCounts]);

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categoriesWithCounts;

    const query = searchQuery.toLowerCase();
    return categoriesWithCounts.filter(
      (cat) =>
        cat.name.toLowerCase().includes(query) ||
        cat.description.toLowerCase().includes(query) ||
        equipment.some(
          (eq) =>
            eq.category === cat.id &&
            (eq.name.toLowerCase().includes(query) ||
              eq.manufacturer?.toLowerCase().includes(query) ||
              eq.model?.toLowerCase().includes(query))
        )
    );
  }, [categoriesWithCounts, searchQuery, equipment]);

  // Get equipment for selected category
  const categoryEquipment = useMemo(() => {
    if (!selectedCategory) return [];
    return equipment.filter((eq) => eq.category === selectedCategory.id);
  }, [equipment, selectedCategory]);

  // Count equipment needing attention
  const attentionCount = useMemo(() => {
    return equipment.filter(eq => eq.conditionStatus === "needs_attention").length;
  }, [equipment]);

  // Filter equipment for list view search
  const filteredEquipment = useMemo(() => {
    if (!searchQuery) return equipment;
    const query = searchQuery.toLowerCase();
    return equipment.filter(
      (eq) =>
        eq.name.toLowerCase().includes(query) ||
        eq.manufacturer?.toLowerCase().includes(query) ||
        eq.model?.toLowerCase().includes(query) ||
        eq.serialNumber?.toLowerCase().includes(query)
    );
  }, [equipment, searchQuery]);

  // Group equipment by category for list view
  const groupedEquipment = useMemo(() => {
    const groups: Record<string, EquipmentItem[]> = {};
    for (const item of filteredEquipment) {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    }
    return groups;
  }, [filteredEquipment]);

  // Get categories that have equipment (for list view)
  const categoriesWithEquipment = useMemo(() => {
    return EQUIPMENT_CATEGORIES.filter(cat => groupedEquipment[cat.id]?.length > 0);
  }, [groupedEquipment]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-captain-600 to-captain-700 px-6 py-5 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Equipment Manifest</h2>
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

        {/* Stats Bar with View Toggle */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 bg-captain-100 rounded-lg flex items-center justify-center">
                <Package size={16} className="text-captain-600" />
              </div>
              <div>
                <span className="font-semibold text-gray-900">{equipment.length}</span>
                <span className="text-gray-500 ml-1">Total Items</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Settings size={16} className="text-blue-600" />
              </div>
              <div>
                <span className="font-semibold text-gray-900">
                  {categoriesWithCounts.filter(c => c.itemCount > 0).length}
                </span>
                <span className="text-gray-500 ml-1">Categories</span>
              </div>
            </div>
            {attentionCount > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle size={16} className="text-red-600" />
                </div>
                <div>
                  <span className="font-semibold text-red-600">{attentionCount}</span>
                  <span className="text-gray-500 ml-1">Need Attention</span>
                </div>
              </div>
            )}
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center bg-white rounded-lg border border-gray-200 p-0.5">
            <button
              onClick={() => {
                setViewMode("categories");
                setSelectedCategory(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === "categories"
                  ? "bg-captain-600 text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <LayoutGrid size={14} />
              Categories
            </button>
            <button
              onClick={() => {
                setViewMode("list");
                setSelectedCategory(null);
                expandAllCategories();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === "list"
                  ? "bg-captain-600 text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <List size={14} />
              Full List
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Search bar */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search equipment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20 transition-all"
            />
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>

          {/* Category View Mode */}
          {viewMode === "categories" && (
            <>
              {!selectedCategory ? (
                // Category Grid View
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {filteredCategories.map((category) => {
                      const IconComponent = category.icon;
                      const isHovered = hoveredCard === category.id;
                      const hasItems = category.itemCount > 0;

                      return (
                        <button
                          key={category.id}
                          onClick={() => hasItems && setSelectedCategory(category)}
                          onMouseEnter={() => setHoveredCard(category.id)}
                          onMouseLeave={() => setHoveredCard(null)}
                          disabled={!hasItems}
                          className={`relative bg-white border rounded-xl p-4 text-center transition-all duration-200 overflow-hidden ${
                            hasItems ? "cursor-pointer" : "cursor-default opacity-60"
                          }`}
                          style={{
                            borderColor: isHovered && hasItems ? COLORS.blueHighlight : COLORS.border,
                            transform: isHovered && hasItems ? "translateY(-2px)" : "translateY(0)",
                            boxShadow: isHovered && hasItems
                              ? `0 4px 12px ${COLORS.blueHighlightDim}`
                              : "0 1px 2px rgba(0, 0, 0, 0.05)",
                          }}
                        >
                          {/* Color accent bar */}
                          <div
                            className="absolute top-0 left-0 right-0 h-0.5 transition-colors duration-200"
                            style={{
                              backgroundColor: isHovered && hasItems ? COLORS.blueHighlight : COLORS.border,
                            }}
                          />

                          <div className="flex items-center justify-center mb-2">
                            <IconComponent
                              size={24}
                              strokeWidth={1.5}
                              style={{
                                color: isHovered && hasItems ? COLORS.blueHighlight : COLORS.iconDefault,
                                transition: "color 0.2s",
                              }}
                            />
                          </div>
                          <div className="text-sm font-semibold text-gray-900 mb-0.5">
                            {category.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {category.itemCount} {category.itemCount === 1 ? "item" : "items"}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Bottom indicator */}
                  {filteredCategories.length > 0 && (
                    <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
                      <span>{filteredCategories.filter(c => c.itemCount > 0).length} active categories</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span>{equipment.length} total items</span>
                    </div>
                  )}
                </>
              ) : (
                // Category Detail View
                <div className="animate-fadeIn">
                  {/* Back button */}
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="flex items-center gap-2 px-3 py-1.5 mb-4 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-captain-300 hover:text-captain-600 transition-all"
                  >
                    <ArrowLeft size={16} />
                    Back to Categories
                  </button>

                  {/* Category header */}
                  <div
                    className="rounded-xl p-5 mb-4 relative overflow-hidden"
                    style={{
                      backgroundColor: COLORS.blueHighlightDim,
                      border: `1px solid ${COLORS.blueHighlight}30`,
                    }}
                  >
                    <div className="relative z-10">
                      <selectedCategory.icon
                        size={36}
                        strokeWidth={1.5}
                        style={{ color: COLORS.blueHighlight }}
                        className="mb-2"
                      />
                      <h4 className="text-xl font-bold text-gray-900">{selectedCategory.name}</h4>
                      <p className="text-sm text-gray-500">
                        {categoryEquipment.length} equipment{" "}
                        {categoryEquipment.length === 1 ? "item" : "items"} tracked
                      </p>
                    </div>
                    {/* Background icon */}
                    <selectedCategory.icon
                      size={100}
                      strokeWidth={1}
                      className="absolute -top-4 -right-4 opacity-5"
                      style={{ color: COLORS.blueHighlight }}
                    />
                  </div>

                  {/* Items list */}
                  <div className="space-y-2">
                    {categoryEquipment.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-xl">
                        <p className="text-gray-500">No equipment in this category</p>
                      </div>
                    ) : (
                      categoryEquipment.map((item) => (
                        <div
                          key={item._id}
                          onClick={() => setSelectedEquipment(item)}
                          className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-captain-300 hover:bg-gray-50 transition-all cursor-pointer group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="font-medium text-gray-900">{item.name}</div>
                              {item.conditionStatus && (
                                <ConditionBadge status={item.conditionStatus} />
                              )}
                            </div>
                            {(item.manufacturer || item.model) && (
                              <div className="text-sm text-gray-500">
                                {[item.manufacturer, item.model].filter(Boolean).join(" ")}
                              </div>
                            )}
                            {item.serialNumber && (
                              <div className="text-xs text-gray-400 mt-0.5">
                                S/N: {item.serialNumber}
                              </div>
                            )}
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-captain-50 transition-colors flex-shrink-0 ml-2">
                            <ChevronRight size={18} className="text-gray-400 group-hover:text-captain-500" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* List View Mode - Full scrollable manifest */}
          {viewMode === "list" && (
            <div className="animate-fadeIn">
              {/* Show equipment detail inline when selected in list view */}
              {listViewEquipment ? (
                <ListViewEquipmentDetail
                  equipment={listViewEquipment}
                  onBack={() => setListViewEquipment(null)}
                />
              ) : (
                <>
                  {/* Expand/Collapse controls */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-gray-500">
                      {filteredEquipment.length} equipment items
                      {searchQuery && ` matching "${searchQuery}"`}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={expandAllCategories}
                        className="text-xs text-captain-600 hover:text-captain-700 font-medium"
                      >
                        Expand All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={collapseAllCategories}
                        className="text-xs text-captain-600 hover:text-captain-700 font-medium"
                      >
                        Collapse All
                      </button>
                    </div>
                  </div>

                  {/* Equipment grouped by category */}
                  {filteredEquipment.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                      <Package size={48} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">
                        {searchQuery ? "No equipment matches your search" : "No equipment in manifest"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {categoriesWithEquipment.map((category) => {
                        const IconComponent = category.icon;
                        const items = groupedEquipment[category.id] || [];
                        const isExpanded = expandedCategories.has(category.id);

                        return (
                          <div
                            key={category.id}
                            className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                          >
                            {/* Category Header - Clickable to expand/collapse */}
                            <button
                              onClick={() => toggleCategoryExpansion(category.id)}
                              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                                  style={{ backgroundColor: COLORS.blueHighlightDim }}
                                >
                                  <IconComponent
                                    size={20}
                                    strokeWidth={1.5}
                                    style={{ color: COLORS.blueHighlight }}
                                  />
                                </div>
                                <div className="text-left">
                                  <div className="font-semibold text-gray-900">{category.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {items.length} {items.length === 1 ? "item" : "items"}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Show condition summary */}
                                {items.some(i => i.conditionStatus === "needs_attention") && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                                    {items.filter(i => i.conditionStatus === "needs_attention").length} need attention
                                  </span>
                                )}
                                {isExpanded ? (
                                  <ChevronUp size={20} className="text-gray-400" />
                                ) : (
                                  <ChevronDown size={20} className="text-gray-400" />
                                )}
                              </div>
                            </button>

                            {/* Category Items - Collapsible */}
                            {isExpanded && (
                              <div className="border-t border-gray-100">
                                {items.map((item, index) => (
                                  <div
                                    key={item._id}
                                    onClick={() => setListViewEquipment(item)}
                                    className={`px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group ${
                                      index !== items.length - 1 ? "border-b border-gray-100" : ""
                                    }`}
                                  >
                                    <div className="flex-1 min-w-0 pl-12">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-gray-900">{item.name}</span>
                                        {item.conditionStatus && (
                                          <ConditionBadge status={item.conditionStatus} />
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                        {(item.manufacturer || item.model) && (
                                          <span className="text-sm text-gray-500">
                                            {[item.manufacturer, item.model].filter(Boolean).join(" ")}
                                          </span>
                                        )}
                                        {item.serialNumber && (
                                          <span className="text-xs text-gray-400">
                                            S/N: {item.serialNumber}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <ChevronRight
                                      size={18}
                                      className="text-gray-300 group-hover:text-captain-500 flex-shrink-0 ml-2"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Equipment Detail Modal - Only for Category View */}
        {viewMode === "categories" && selectedEquipment && (
          <EquipmentDetailView
            equipment={selectedEquipment}
            onClose={() => setSelectedEquipment(null)}
          />
        )}
      </div>
    </div>
  );
}

// Condition Badge Component
function ConditionBadge({ status }: { status: "good" | "fair" | "needs_attention" }) {
  const config = {
    good: { label: "Good", className: "bg-green-100 text-green-700", icon: CheckCircle },
    fair: { label: "Fair", className: "bg-yellow-100 text-yellow-700", icon: AlertCircle },
    needs_attention: { label: "Needs Attention", className: "bg-red-100 text-red-700", icon: AlertTriangle },
  };

  const { label, className, icon: Icon } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}

// Inline Equipment Detail for List View (no popup)
interface ListViewEquipmentDetailProps {
  equipment: EquipmentItem;
  onBack: () => void;
}

function ListViewEquipmentDetail({ equipment, onBack }: ListViewEquipmentDetailProps) {
  // Format date for display
  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calculate next service due
  const getNextServiceInfo = () => {
    // Hours-based service
    if (equipment.currentHours && equipment.lastServiceHours && equipment.serviceIntervalHours) {
      const hoursSinceService = equipment.currentHours - equipment.lastServiceHours;
      const hoursUntilService = equipment.serviceIntervalHours - hoursSinceService;
      const isOverdue = hoursUntilService <= 0;
      return {
        type: "hours",
        value: Math.abs(hoursUntilService),
        isOverdue,
        label: isOverdue ? `${Math.abs(hoursUntilService)} hours overdue` : `In ${hoursUntilService} hours`,
      };
    }
    // Date-based service
    if (equipment.nextServiceDate) {
      const today = new Date();
      const serviceDate = new Date(equipment.nextServiceDate);
      const daysUntil = Math.ceil((serviceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = daysUntil < 0;
      return {
        type: "date",
        value: Math.abs(daysUntil),
        isOverdue,
        label: isOverdue ? `${Math.abs(daysUntil)} days overdue` : `In ${daysUntil} days`,
        date: formatDate(equipment.nextServiceDate),
      };
    }
    return null;
  };

  const nextService = getNextServiceInfo();

  // Get category info
  const category = EQUIPMENT_CATEGORIES.find(c => c.id === equipment.category);
  const CategoryIcon = category?.icon || Package;

  return (
    <div className="animate-fadeIn">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-3 py-1.5 mb-4 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-captain-300 hover:text-captain-600 transition-all"
      >
        <ArrowLeft size={16} />
        Back to List
      </button>

      {/* Equipment header */}
      <div
        className="rounded-xl p-5 mb-4 relative overflow-hidden"
        style={{
          backgroundColor: COLORS.blueHighlightDim,
          border: `1px solid ${COLORS.blueHighlight}30`,
        }}
      >
        <div className="relative z-10 flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${COLORS.blueHighlight}20` }}
          >
            <CategoryIcon
              size={28}
              strokeWidth={1.5}
              style={{ color: COLORS.blueHighlight }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="text-xl font-bold text-gray-900">{equipment.name}</h4>
              {equipment.conditionStatus && (
                <ConditionBadge status={equipment.conditionStatus} />
              )}
            </div>
            {(equipment.manufacturer || equipment.model) && (
              <p className="text-sm text-gray-600">
                {[equipment.manufacturer, equipment.model].filter(Boolean).join(" ")}
              </p>
            )}
            {category && (
              <p className="text-xs text-gray-500 mt-1">{category.name}</p>
            )}
          </div>
        </div>
        {/* Background icon */}
        <CategoryIcon
          size={100}
          strokeWidth={1}
          className="absolute -top-4 -right-4 opacity-5"
          style={{ color: COLORS.blueHighlight }}
        />
      </div>

      {/* Content sections */}
      <div className="space-y-4">
        {/* Condition Status Alert */}
        {equipment.conditionStatus && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 ${
              equipment.conditionStatus === "good"
                ? "bg-green-50 border border-green-200"
                : equipment.conditionStatus === "fair"
                ? "bg-yellow-50 border border-yellow-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            {equipment.conditionStatus === "good" ? (
              <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
            ) : equipment.conditionStatus === "fair" ? (
              <AlertCircle className="text-yellow-600 flex-shrink-0" size={24} />
            ) : (
              <AlertTriangle className="text-red-600 flex-shrink-0" size={24} />
            )}
            <div>
              <div
                className={`font-medium ${
                  equipment.conditionStatus === "good"
                    ? "text-green-800"
                    : equipment.conditionStatus === "fair"
                    ? "text-yellow-800"
                    : "text-red-800"
                }`}
              >
                Condition:{" "}
                {equipment.conditionStatus === "needs_attention"
                  ? "Needs Attention"
                  : equipment.conditionStatus.charAt(0).toUpperCase() +
                    equipment.conditionStatus.slice(1)}
              </div>
            </div>
          </div>
        )}

        {/* Next Service Alert */}
        {nextService && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 ${
              nextService.isOverdue
                ? "bg-red-50 border border-red-200"
                : nextService.value <= 30
                ? "bg-yellow-50 border border-yellow-200"
                : "bg-blue-50 border border-blue-200"
            }`}
          >
            <Wrench
              className={`flex-shrink-0 ${
                nextService.isOverdue
                  ? "text-red-600"
                  : nextService.value <= 30
                  ? "text-yellow-600"
                  : "text-blue-600"
              }`}
              size={24}
            />
            <div>
              <div
                className={`font-medium ${
                  nextService.isOverdue
                    ? "text-red-800"
                    : nextService.value <= 30
                    ? "text-yellow-800"
                    : "text-blue-800"
                }`}
              >
                {nextService.isOverdue ? "Service Overdue" : "Next Service Due"}
              </div>
              <div
                className={`text-sm ${
                  nextService.isOverdue
                    ? "text-red-600"
                    : nextService.value <= 30
                    ? "text-yellow-600"
                    : "text-blue-600"
                }`}
              >
                {nextService.label}
                {nextService.date && ` (${nextService.date})`}
              </div>
            </div>
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Info size={16} />
            Basic Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <ListInfoField label="Manufacturer" value={equipment.manufacturer} />
            <ListInfoField label="Model" value={equipment.model} />
            <ListInfoField label="Serial Number" value={equipment.serialNumber} />
            <ListInfoField label="Installation Date" value={formatDate(equipment.installationDate)} />
          </div>
        </div>

        {/* Service Info */}
        {(equipment.lastServiceDate || equipment.nextServiceDate || equipment.currentHours) && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Wrench size={16} />
              Service Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <ListInfoField label="Last Service" value={formatDate(equipment.lastServiceDate)} />
              <ListInfoField
                label="Next Service Due"
                value={
                  equipment.nextServiceDate
                    ? formatDate(equipment.nextServiceDate)
                    : equipment.serviceIntervalDays
                    ? `Every ${equipment.serviceIntervalDays} days`
                    : undefined
                }
              />
              {equipment.currentHours !== undefined && (
                <ListInfoField label="Current Hours" value={`${equipment.currentHours.toLocaleString()} hrs`} />
              )}
              {equipment.serviceIntervalHours !== undefined && (
                <ListInfoField label="Service Interval" value={`Every ${equipment.serviceIntervalHours} hrs`} />
              )}
            </div>
          </div>
        )}

        {/* Warranty Info */}
        {(equipment.warrantyExpiry || equipment.warrantyTerms) && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ShieldAlert size={16} />
              Warranty
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <ListInfoField
                label="Expiration"
                value={formatDate(equipment.warrantyExpiry)}
                highlight={
                  equipment.warrantyExpiry
                    ? equipment.warrantyExpiry > Date.now()
                      ? "active"
                      : "expired"
                    : undefined
                }
              />
              {equipment.warrantyTerms && (
                <div className="col-span-2">
                  <ListInfoField label="Terms" value={equipment.warrantyTerms} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Consumable Parts - future feature */}
        {(equipment as any).consumableParts && (equipment as any).consumableParts.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package size={16} />
              Consumable Parts
            </h3>
            <div className="space-y-2">
              {(equipment as any).consumableParts.map((part: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                >
                  <span className="text-sm text-gray-900">{part.name}</span>
                  {part.partNumber && (
                    <span className="text-xs text-gray-500">#{part.partNumber}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {equipment.notes && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Info size={16} />
              Notes
            </h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{equipment.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Info field for list view inline detail
function ListInfoField({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | undefined;
  highlight?: "active" | "expired";
}) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div
        className={`text-sm font-medium ${
          highlight === "active"
            ? "text-green-600"
            : highlight === "expired"
            ? "text-red-600"
            : value && value !== "—"
            ? "text-gray-900"
            : "text-gray-400"
        }`}
      >
        {value || "—"}
        {highlight === "active" && (
          <span className="ml-2 text-xs font-normal text-green-600">(Active)</span>
        )}
        {highlight === "expired" && (
          <span className="ml-2 text-xs font-normal text-red-600">(Expired)</span>
        )}
      </div>
    </div>
  );
}

// Read-only Equipment Detail View
interface EquipmentDetailViewProps {
  equipment: EquipmentItem;
  onClose: () => void;
}

function EquipmentDetailView({ equipment, onClose }: EquipmentDetailViewProps) {
  // Format date for display
  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calculate next service due
  const getNextServiceInfo = () => {
    // Hours-based service
    if (equipment.currentHours && equipment.lastServiceHours && equipment.serviceIntervalHours) {
      const hoursSinceService = equipment.currentHours - equipment.lastServiceHours;
      const hoursUntilService = equipment.serviceIntervalHours - hoursSinceService;
      const isOverdue = hoursUntilService <= 0;
      return {
        type: "hours",
        value: Math.abs(hoursUntilService),
        isOverdue,
        label: isOverdue ? `${Math.abs(hoursUntilService)} hours overdue` : `In ${hoursUntilService} hours`,
      };
    }

    // Date-based service
    if (equipment.nextServiceDate) {
      const now = Date.now();
      const daysUntil = Math.ceil((equipment.nextServiceDate - now) / (1000 * 60 * 60 * 24));
      const isOverdue = daysUntil < 0;
      return {
        type: "date",
        value: Math.abs(daysUntil),
        isOverdue,
        label: isOverdue ? `${Math.abs(daysUntil)} days overdue` : `In ${daysUntil} days`,
        date: formatDate(equipment.nextServiceDate),
      };
    }

    if (equipment.lastServiceDate && equipment.serviceIntervalDays) {
      const nextDate = equipment.lastServiceDate + equipment.serviceIntervalDays * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const daysUntil = Math.ceil((nextDate - now) / (1000 * 60 * 60 * 24));
      const isOverdue = daysUntil < 0;
      return {
        type: "date",
        value: Math.abs(daysUntil),
        isOverdue,
        label: isOverdue ? `${Math.abs(daysUntil)} days overdue` : `In ${daysUntil} days`,
        date: formatDate(nextDate),
      };
    }

    return null;
  };

  const nextService = getNextServiceInfo();

  // Find category info
  const category = EQUIPMENT_CATEGORIES.find((c) => c.id === equipment.category);
  const CategoryIcon = category?.icon || Settings;

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl z-10">
      <div className="w-full max-w-lg mx-4 rounded-2xl bg-white shadow-xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: COLORS.blueHighlightDim }}
            >
              <CategoryIcon size={20} style={{ color: COLORS.blueHighlight }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{equipment.name}</h2>
              <p className="text-sm text-gray-500">{category?.name || equipment.category}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Condition Status Alert */}
          {equipment.conditionStatus && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 ${
                equipment.conditionStatus === "good"
                  ? "bg-green-50 border border-green-200"
                  : equipment.conditionStatus === "fair"
                  ? "bg-yellow-50 border border-yellow-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              {equipment.conditionStatus === "good" ? (
                <CheckCircle className="text-green-600" size={24} />
              ) : equipment.conditionStatus === "fair" ? (
                <AlertCircle className="text-yellow-600" size={24} />
              ) : (
                <AlertTriangle className="text-red-600" size={24} />
              )}
              <div>
                <div
                  className={`font-medium ${
                    equipment.conditionStatus === "good"
                      ? "text-green-800"
                      : equipment.conditionStatus === "fair"
                      ? "text-yellow-800"
                      : "text-red-800"
                  }`}
                >
                  Condition:{" "}
                  {equipment.conditionStatus === "needs_attention"
                    ? "Needs Attention"
                    : equipment.conditionStatus.charAt(0).toUpperCase() +
                      equipment.conditionStatus.slice(1)}
                </div>
              </div>
            </div>
          )}

          {/* Next Service Alert */}
          {nextService && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 ${
                nextService.isOverdue
                  ? "bg-red-50 border border-red-200"
                  : nextService.value <= 30
                  ? "bg-yellow-50 border border-yellow-200"
                  : "bg-blue-50 border border-blue-200"
              }`}
            >
              <Wrench
                className={
                  nextService.isOverdue
                    ? "text-red-600"
                    : nextService.value <= 30
                    ? "text-yellow-600"
                    : "text-blue-600"
                }
                size={24}
              />
              <div>
                <div
                  className={`font-medium ${
                    nextService.isOverdue
                      ? "text-red-800"
                      : nextService.value <= 30
                      ? "text-yellow-800"
                      : "text-blue-800"
                  }`}
                >
                  {nextService.isOverdue ? "Service Overdue" : "Next Service Due"}
                </div>
                <div
                  className={`text-sm ${
                    nextService.isOverdue
                      ? "text-red-600"
                      : nextService.value <= 30
                      ? "text-yellow-600"
                      : "text-blue-600"
                  }`}
                >
                  {nextService.label}
                  {nextService.date && ` (${nextService.date})`}
                </div>
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <InfoField label="Manufacturer" value={equipment.manufacturer} />
            <InfoField label="Model" value={equipment.model} />
            <InfoField label="Serial Number" value={equipment.serialNumber} />
            <InfoField
              label="Installation Date"
              value={formatDate(equipment.installationDate)}
            />
          </div>

          {/* Service Info */}
          {(equipment.lastServiceDate || equipment.nextServiceDate || equipment.currentHours) && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Wrench size={16} />
                Service Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <InfoField
                  label="Last Service"
                  value={formatDate(equipment.lastServiceDate)}
                />
                <InfoField
                  label="Next Service Due"
                  value={
                    equipment.nextServiceDate
                      ? formatDate(equipment.nextServiceDate)
                      : equipment.serviceIntervalDays
                      ? `Every ${equipment.serviceIntervalDays} days`
                      : undefined
                  }
                />
                {equipment.currentHours !== undefined && (
                  <InfoField
                    label="Current Hours"
                    value={`${equipment.currentHours.toLocaleString()} hrs`}
                  />
                )}
                {equipment.serviceIntervalHours !== undefined && (
                  <InfoField
                    label="Service Interval"
                    value={`Every ${equipment.serviceIntervalHours} hrs`}
                  />
                )}
              </div>
            </div>
          )}

          {/* Warranty Info */}
          {(equipment.warrantyExpiry || equipment.warrantyTerms) && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ShieldAlert size={16} />
                Warranty
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <InfoField
                  label="Expiration"
                  value={formatDate(equipment.warrantyExpiry)}
                  highlight={
                    equipment.warrantyExpiry && equipment.warrantyExpiry > Date.now()
                      ? "active"
                      : equipment.warrantyExpiry
                      ? "expired"
                      : undefined
                  }
                />
                <InfoField label="Terms" value={equipment.warrantyTerms} />
              </div>
            </div>
          )}

          {/* Consumable Parts */}
          {equipment.consumablePartNumbers && equipment.consumablePartNumbers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Package size={16} />
                Consumable Part Numbers
              </h3>
              <div className="space-y-2">
                {equipment.consumablePartNumbers.map((part, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{part.name}</div>
                      <div className="text-sm text-gray-500">
                        {part.manufacturer && `${part.manufacturer} • `}P/N: {part.partNumber}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {equipment.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Info size={16} />
                Notes
              </h3>
              <p className="text-gray-600 text-sm whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                {equipment.notes}
              </p>
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

// Info Field Component for display mode
function InfoField({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | undefined;
  highlight?: "active" | "expired";
}) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div
        className={`text-sm font-medium ${
          highlight === "active"
            ? "text-green-600"
            : highlight === "expired"
            ? "text-red-600"
            : "text-gray-900"
        }`}
      >
        {value || "—"}
      </div>
    </div>
  );
}

export default ManifestViewer;
