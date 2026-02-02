"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
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
  Plus,
  ArrowLeft,
  ChevronRight,
  X,
  LucideIcon,
  Calendar,
  Clock,
  Wrench,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Edit3,
  Trash2,
  Package,
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
  defaultItems: string[];
}

const EQUIPMENT_CATEGORIES: CategoryDefinition[] = [
  {
    id: "propulsion",
    name: "Propulsion",
    icon: Settings,
    defaultItems: ["Main Engine", "Outboard Motors", "Propellers", "Transmission"],
  },
  {
    id: "electrical",
    name: "Electrical",
    icon: Zap,
    defaultItems: ["Batteries", "Generator", "Solar Panels", "Shore Power"],
  },
  {
    id: "electronics",
    name: "Navigation",
    icon: Compass,
    defaultItems: ["GPS", "VHF Radio", "Radar", "Autopilot"],
  },
  {
    id: "plumbing",
    name: "Plumbing",
    icon: Droplets,
    defaultItems: ["Fresh Water", "Heads", "Bilge Pumps", "Seacocks"],
  },
  {
    id: "fuel",
    name: "Fuel",
    icon: Fuel,
    defaultItems: ["Fuel Tanks", "Fuel Filters", "Fuel Lines"],
  },
  {
    id: "hvac",
    name: "Climate",
    icon: Wind,
    defaultItems: ["AC Units", "Heating", "Ventilation"],
  },
  {
    id: "deck",
    name: "Deck",
    icon: Anchor,
    defaultItems: ["Windlass", "Anchors", "Winches", "Swim Platform"],
  },
  {
    id: "safety",
    name: "Safety",
    icon: ShieldAlert,
    defaultItems: ["Life Jackets", "Fire Extinguishers", "Flares", "Life Raft"],
  },
  {
    id: "steering",
    name: "Steering",
    icon: Gauge,
    defaultItems: ["Hydraulic System", "Rudders", "Trim Tabs"],
  },
  {
    id: "hull",
    name: "Hull",
    icon: Ship,
    defaultItems: ["Anti-fouling", "Zincs", "Thru-hulls"],
  },
  {
    id: "canvas",
    name: "Canvas",
    icon: Tent,
    defaultItems: ["Bimini", "Enclosure", "Covers"],
  },
  {
    id: "galley",
    name: "Galley",
    icon: UtensilsCrossed,
    defaultItems: ["Stove", "Refrigerator", "Microwave"],
  },
  {
    id: "entertainment",
    name: "Entertainment",
    icon: Music,
    defaultItems: ["Stereo", "Speakers", "TV", "Lighting"],
  },
  {
    id: "rigging",
    name: "Rigging",
    icon: Cable,
    defaultItems: ["Mast", "Boom", "Standing Rigging", "Sails"],
  },
  {
    id: "tender",
    name: "Tender",
    icon: Waves,
    defaultItems: ["Dinghy", "Water Toys", "Dive Equipment"],
  },
];

interface EquipmentManifestProps {
  vesselId: Id<"vessels">;
}

export function EquipmentManifest({ vesselId }: EquipmentManifestProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryDefinition | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);

  // Fetch equipment data from Convex
  const equipment = useQuery(api.vesselEquipment.listByVessel, { vesselId }) ?? [];
  const categoryCounts = useQuery(api.vesselEquipment.getCategoryCounts, { vesselId }) ?? {};

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
        cat.defaultItems.some((item) => item.toLowerCase().includes(query)) ||
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

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Equipment Manifest</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-captain-600 bg-captain-50 rounded-lg hover:bg-captain-100 transition-colors"
        >
          <Plus size={16} />
          Add Item
        </button>
      </div>

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

      {/* Content */}
      {!selectedCategory ? (
        // Category Grid View
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredCategories.map((category) => {
            const IconComponent = category.icon;
            const isHovered = hoveredCard === category.id;

            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category)}
                onMouseEnter={() => setHoveredCard(category.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className="relative bg-white border rounded-xl p-4 text-center transition-all duration-200 overflow-hidden group"
                style={{
                  borderColor: isHovered ? COLORS.blueHighlight : COLORS.border,
                  transform: isHovered ? "translateY(-2px)" : "translateY(0)",
                  boxShadow: isHovered
                    ? `0 4px 12px ${COLORS.blueHighlightDim}`
                    : "0 1px 2px rgba(0, 0, 0, 0.05)",
                }}
              >
                {/* Color accent bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-0.5 transition-colors duration-200"
                  style={{
                    backgroundColor: isHovered ? COLORS.blueHighlight : COLORS.border,
                  }}
                />

                <div className="flex items-center justify-center mb-2">
                  <IconComponent
                    size={28}
                    strokeWidth={1.5}
                    style={{
                      color: isHovered ? COLORS.blueHighlight : COLORS.iconDefault,
                      transition: "color 0.2s",
                    }}
                  />
                </div>
                <div className="text-sm font-semibold text-gray-900 mb-1">
                  {category.name}
                </div>
                <div className="text-xs text-gray-400">
                  {category.itemCount} {category.itemCount === 1 ? "item" : "items"}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        // Category Detail View
        <div className="animate-fadeIn">
          {/* Back button */}
          <button
            onClick={() => setSelectedCategory(null)}
            className="flex items-center gap-2 px-3 py-1.5 mb-4 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-captain-300 hover:text-captain-600 transition-all"
          >
            <ArrowLeft size={16} />
            Back
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
                <p className="text-gray-500 mb-2">No equipment in this category yet</p>
                <p className="text-sm text-gray-400">
                  Add items like: {selectedCategory.defaultItems.slice(0, 3).join(", ")}
                </p>
              </div>
            ) : (
              categoryEquipment.map((item) => (
                <div
                  key={item._id}
                  onClick={() => setSelectedEquipment(item)}
                  className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-captain-300 hover:bg-gray-50 transition-all cursor-pointer group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
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

          {/* Add new item button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full mt-4 p-4 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all hover:bg-captain-50"
            style={{
              borderColor: `${COLORS.blueHighlight}60`,
              color: COLORS.blueHighlight,
              backgroundColor: COLORS.blueHighlightDim,
            }}
          >
            <Plus size={18} strokeWidth={2.5} />
            Add New {selectedCategory.name} Item
          </button>
        </div>
      )}

      {/* Bottom indicator */}
      {!selectedCategory && filteredCategories.length > 0 && (
        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
          <span>{filteredCategories.length} categories</span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span>{equipment.length} total items</span>
        </div>
      )}

      {/* Add Equipment Modal */}
      {showAddModal && (
        <AddEquipmentModal
          vesselId={vesselId}
          defaultCategory={selectedCategory?.id}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Equipment Detail Modal */}
      {selectedEquipment && (
        <EquipmentDetailModal
          equipment={selectedEquipment}
          onClose={() => setSelectedEquipment(null)}
          onUpdate={() => {
            // Equipment will auto-refresh via Convex reactivity
            setSelectedEquipment(null);
          }}
        />
      )}
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

// Add Equipment Modal Component
interface AddEquipmentModalProps {
  vesselId: Id<"vessels">;
  defaultCategory?: string;
  onClose: () => void;
}

function AddEquipmentModal({ vesselId, defaultCategory, onClose }: AddEquipmentModalProps) {
  const createEquipment = useMutation(api.vesselEquipment.createEquipment);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      await createEquipment({
        vesselId,
        category: formData.get("category") as any,
        name: formData.get("name") as string,
        manufacturer: (formData.get("manufacturer") as string) || undefined,
        model: (formData.get("model") as string) || undefined,
        serialNumber: (formData.get("serialNumber") as string) || undefined,
        yearInstalled: formData.get("yearInstalled")
          ? parseInt(formData.get("yearInstalled") as string)
          : undefined,
        notes: (formData.get("notes") as string) || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add equipment");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md mx-4 rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Add Equipment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              name="category"
              required
              defaultValue={defaultCategory || ""}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
            >
              <option value="" disabled>
                Select a category
              </option>
              {EQUIPMENT_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Equipment Name *
            </label>
            <input
              name="name"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
              placeholder="e.g., Main Engine"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manufacturer
              </label>
              <input
                name="manufacturer"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                placeholder="e.g., Yamaha"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <input
                name="model"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                placeholder="e.g., F250XCA"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Serial Number
              </label>
              <input
                name="serialNumber"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                placeholder="e.g., 12345678"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year Installed
              </label>
              <input
                name="yearInstalled"
                type="number"
                min="1900"
                max={new Date().getFullYear() + 1}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                placeholder="2023"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
              placeholder="Additional details..."
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-captain-600 px-4 py-2 font-semibold text-white hover:bg-captain-700 disabled:opacity-50"
            >
              {isLoading ? "Adding..." : "Add Equipment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Equipment Detail Modal Component
interface EquipmentDetailModalProps {
  equipment: EquipmentItem;
  onClose: () => void;
  onUpdate: () => void;
}

function EquipmentDetailModal({ equipment, onClose, onUpdate }: EquipmentDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddPart, setShowAddPart] = useState(false);

  const updateEquipment = useMutation(api.vesselEquipment.updateEquipment);
  const deleteEquipment = useMutation(api.vesselEquipment.deleteEquipment);

  // Format date for display
  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format date for input
  const formatDateForInput = (timestamp: number | undefined) => {
    if (!timestamp) return "";
    return new Date(timestamp).toISOString().split("T")[0];
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      await updateEquipment({
        equipmentId: equipment._id,
        name: formData.get("name") as string,
        manufacturer: (formData.get("manufacturer") as string) || undefined,
        model: (formData.get("model") as string) || undefined,
        serialNumber: (formData.get("serialNumber") as string) || undefined,
        installationDate: formData.get("installationDate")
          ? new Date(formData.get("installationDate") as string).getTime()
          : undefined,
        lastServiceDate: formData.get("lastServiceDate")
          ? new Date(formData.get("lastServiceDate") as string).getTime()
          : undefined,
        nextServiceDate: formData.get("nextServiceDate")
          ? new Date(formData.get("nextServiceDate") as string).getTime()
          : undefined,
        serviceIntervalDays: formData.get("serviceIntervalDays")
          ? parseInt(formData.get("serviceIntervalDays") as string)
          : undefined,
        currentHours: formData.get("currentHours")
          ? parseFloat(formData.get("currentHours") as string)
          : undefined,
        serviceIntervalHours: formData.get("serviceIntervalHours")
          ? parseInt(formData.get("serviceIntervalHours") as string)
          : undefined,
        conditionStatus: (formData.get("conditionStatus") as any) || undefined,
        warrantyExpiry: formData.get("warrantyExpiry")
          ? new Date(formData.get("warrantyExpiry") as string).getTime()
          : undefined,
        warrantyTerms: (formData.get("warrantyTerms") as string) || undefined,
        notes: (formData.get("notes") as string) || undefined,
      });
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update equipment");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteEquipment({ equipmentId: equipment._id });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete equipment");
    } finally {
      setIsLoading(false);
    }
  };

  // Find category info
  const category = EQUIPMENT_CATEGORIES.find((c) => c.id === equipment.category);
  const CategoryIcon = category?.icon || Settings;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl mx-4 rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
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
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-gray-400 hover:text-captain-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Edit3 size={18} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isEditing ? (
            // Edit Form
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Package size={16} />
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Equipment Name *
                    </label>
                    <input
                      name="name"
                      required
                      defaultValue={equipment.name}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manufacturer
                    </label>
                    <input
                      name="manufacturer"
                      defaultValue={equipment.manufacturer || ""}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model
                    </label>
                    <input
                      name="model"
                      defaultValue={equipment.model || ""}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Serial Number
                    </label>
                    <input
                      name="serialNumber"
                      defaultValue={equipment.serialNumber || ""}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Condition Status
                    </label>
                    <select
                      name="conditionStatus"
                      defaultValue={equipment.conditionStatus || ""}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    >
                      <option value="">Select condition</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="needs_attention">Needs Attention</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dates Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar size={16} />
                  Installation & Service Dates
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Installation Date
                    </label>
                    <input
                      name="installationDate"
                      type="date"
                      defaultValue={formatDateForInput(equipment.installationDate)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Service Date
                    </label>
                    <input
                      name="lastServiceDate"
                      type="date"
                      defaultValue={formatDateForInput(equipment.lastServiceDate)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Next Service Due
                    </label>
                    <input
                      name="nextServiceDate"
                      type="date"
                      defaultValue={formatDateForInput(equipment.nextServiceDate)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Interval (days)
                    </label>
                    <input
                      name="serviceIntervalDays"
                      type="number"
                      min="1"
                      defaultValue={equipment.serviceIntervalDays || ""}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                      placeholder="e.g., 365"
                    />
                  </div>
                </div>
              </div>

              {/* Hours Tracking Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock size={16} />
                  Hours Tracking
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Hours
                    </label>
                    <input
                      name="currentHours"
                      type="number"
                      step="0.1"
                      min="0"
                      defaultValue={equipment.currentHours || ""}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                      placeholder="e.g., 450.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Interval (hours)
                    </label>
                    <input
                      name="serviceIntervalHours"
                      type="number"
                      min="1"
                      defaultValue={equipment.serviceIntervalHours || ""}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                      placeholder="e.g., 100"
                    />
                  </div>
                </div>
              </div>

              {/* Warranty Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <ShieldAlert size={16} />
                  Warranty Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Warranty Expiration
                    </label>
                    <input
                      name="warrantyExpiry"
                      type="date"
                      defaultValue={formatDateForInput(equipment.warrantyExpiry)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Warranty Terms
                    </label>
                    <input
                      name="warrantyTerms"
                      defaultValue={equipment.warrantyTerms || ""}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                      placeholder="e.g., 3 year limited"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={equipment.notes || ""}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                  placeholder="Additional notes..."
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                >
                  Delete
                </button>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-captain-600 text-white rounded-lg font-semibold hover:bg-captain-700 disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            // View Mode
            <div className="space-y-6">
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
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Wrench size={16} />
                  Service History
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
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-gray-600 text-sm whitespace-pre-wrap">{equipment.notes}</p>
                </div>
              )}

              {/* Edit Button */}
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-3 bg-captain-600 text-white rounded-xl font-semibold hover:bg-captain-700 transition-colors flex items-center justify-center gap-2"
              >
                <Edit3 size={18} />
                Edit Equipment Details
              </button>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
            <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="text-red-600" size={20} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Equipment?</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete "{equipment.name}"? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {isLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
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

export default EquipmentManifest;
