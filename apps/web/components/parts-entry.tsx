"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { PartsAutocomplete, PartSuggestion } from "./parts-autocomplete";
import { useTheme } from "./providers/theme-provider";

interface PartEntry {
  id: string;
  name: string;
  partNumber: string;
  manufacturer: string;
  category: string;
  equipmentId?: Id<"vesselEquipment">;
  quantity: number;
  unitCost: number;
  serialNumber?: string;
  warrantyExpiry?: number;
  warrantyTerms?: string;
  photoStorageId?: Id<"_storage">;
  photoPreview?: string;
}

interface PartsEntryProps {
  workOrderId: Id<"workOrders">;
  vesselId: Id<"vessels">;
  onPartAdded?: () => void;
}

const CATEGORIES = [
  { id: "engine", name: "Engine" },
  { id: "electrical", name: "Electrical" },
  { id: "plumbing", name: "Plumbing" },
  { id: "fuel", name: "Fuel" },
  { id: "cooling", name: "Cooling" },
  { id: "steering", name: "Steering" },
  { id: "hvac", name: "HVAC" },
  { id: "safety", name: "Safety" },
  { id: "general", name: "General" },
];

export function PartsEntry({ workOrderId, vesselId, onPartAdded }: PartsEntryProps) {
  const { mode } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [newPart, setNewPart] = useState<Partial<PartEntry>>({
    quantity: 1,
    unitCost: 0,
    category: "general",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const recentParts = useQuery(api.parts.getRecentParts, { limit: 10 });
  const vesselHistory = useQuery(api.parts.getVesselPartHistory, { vesselId, limit: 10 });
  const workOrderParts = useQuery(api.workOrders.getWorkOrder, { workOrderId });
  const vesselEngines = useQuery(api.vesselEquipment.listByCategory, { vesselId, category: "propulsion" });

  // Mutations
  const addPart = useMutation(api.workOrders.addPart);
  const removePart = useMutation(api.workOrders.removePart);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const defaultEngineId = vesselEngines?.[0]?._id;

  // Handle part selection from autocomplete
  const handlePartSelect = (part: PartSuggestion) => {
    if (part.isNew) {
      setNewPart({
        name: part.name,
        partNumber: "",
        manufacturer: "",
        category: "general",
        equipmentId: defaultEngineId,
        quantity: 1,
        unitCost: 0,
      });
      setShowManualEntry(true);
    } else {
      setNewPart({
        name: part.name,
        partNumber: part.partNumber,
        manufacturer: part.manufacturer,
        category: part.category || "general",
        equipmentId: defaultEngineId,
        quantity: 1,
        unitCost: part.averagePrice || 0,
      });
      setShowManualEntry(true);
    }
  };

  // Handle quick select from recent or vessel history
  const handleQuickSelect = (part: {
    name: string;
    partNumber?: string;
    manufacturer?: string;
    category?: string;
  }) => {
    setNewPart({
      name: part.name,
      partNumber: part.partNumber || "",
      manufacturer: part.manufacturer || "",
      category: part.category || "general",
      equipmentId: defaultEngineId,
      quantity: 1,
      unitCost: 0,
    });
    setShowManualEntry(true);
  };

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewPart(prev => ({ ...prev, photoPreview: reader.result as string }));
    };
    reader.readAsDataURL(file);

    // Upload to storage
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await response.json();
      setNewPart(prev => ({ ...prev, photoStorageId: storageId }));
    } catch (err) {
      console.error("Failed to upload photo:", err);
    }
  };

  // Add part to work order
  const handleAddPart = async () => {
    if (!newPart.name || !newPart.quantity) return;

    setIsAdding(true);
    setAddError(null);
    try {
      await addPart({
        workOrderId,
        name: newPart.name,
        partNumber: newPart.partNumber || undefined,
        serialNumber: newPart.serialNumber || undefined,
        manufacturer: newPart.manufacturer || undefined,
        category: newPart.category || undefined,
        equipmentId: newPart.equipmentId || undefined,
        quantity: newPart.quantity,
        unitCost: newPart.unitCost || undefined,
        warrantyExpiry: newPart.warrantyExpiry || undefined,
        warrantyTerms: newPart.warrantyTerms || undefined,
        photoStorageId: newPart.photoStorageId || undefined,
      });

      // Reset form
      setNewPart({
        quantity: 1,
        unitCost: 0,
        category: "general",
        equipmentId: vesselEngines?.[0]?._id,
      });
      setShowManualEntry(false);
      setSearchQuery("");
      onPartAdded?.();
    } catch (err: any) {
      console.error("Failed to add part:", err);
      setAddError(err?.message || "Failed to add part. Make sure the work order is In Progress.");
    } finally {
      setIsAdding(false);
    }
  };

  // Remove part from work order
  const handleRemovePart = async (partId: Id<"workOrderParts">) => {
    try {
      await removePart({ partId });
    } catch (err) {
      console.error("Failed to remove part:", err);
    }
  };

  // Format relative time
  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  const currentParts = workOrderParts?.parts || [];

  return (
    <div className="space-y-6">
      {/* Search / Add Parts */}
      <div>
        <h3 className={`text-lg font-semibold mb-3 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Add Parts</h3>
        
        {!showManualEntry ? (
          <PartsAutocomplete
            value={searchQuery}
            onChange={setSearchQuery}
            onSelect={handlePartSelect}
            placeholder="Search parts or enter new..."
          />
        ) : (
          /* Manual Entry Form */
          <div className={`rounded-lg p-4 space-y-4 ${mode === 'dark' ? "bg-white/5" : "bg-gray-50"}`}>
            <div className="flex items-center justify-between">
              <h4 className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Part Details</h4>
              <button
                onClick={() => {
                  setShowManualEntry(false);
                  setNewPart({ quantity: 1, unitCost: 0, category: "general" });
                }}
                className={`transition-colors ${mode === 'dark' ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Part Name */}
              <div className="col-span-2">
                <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                  Part Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPart.name || ""}
                  onChange={(e) => setNewPart(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 ${
                    mode === 'dark' 
                      ? "bg-black/20 border-white/10 text-white placeholder-gray-500" 
                      : "bg-white border-gray-300 text-black placeholder-gray-400"
                  }`}
                  placeholder="e.g., Oil Filter"
                />
              </div>

              {/* Part Number */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>Part Number</label>
                <input
                  type="text"
                  value={newPart.partNumber || ""}
                  onChange={(e) => setNewPart(prev => ({ ...prev, partNumber: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 font-mono ${
                    mode === 'dark' 
                      ? "bg-black/20 border-white/10 text-white placeholder-gray-500" 
                      : "bg-white border-gray-300 text-black placeholder-gray-400"
                  }`}
                  placeholder="e.g., 35-877761K01"
                />
              </div>

              {/* Manufacturer */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>Manufacturer</label>
                <input
                  type="text"
                  value={newPart.manufacturer || ""}
                  onChange={(e) => setNewPart(prev => ({ ...prev, manufacturer: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 ${
                    mode === 'dark' 
                      ? "bg-black/20 border-white/10 text-white placeholder-gray-500" 
                      : "bg-white border-gray-300 text-black placeholder-gray-400"
                  }`}
                  placeholder="e.g., Mercury"
                />
              </div>

              {/* Category */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>Category</label>
                <select
                  value={newPart.category || "general"}
                  onChange={(e) => setNewPart(prev => ({ ...prev, category: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 ${
                    mode === 'dark'
                      ? "bg-black/20 border-white/10 text-white"
                      : "bg-white border-gray-300 text-black"
                  }`}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Engine */}
              {vesselEngines && vesselEngines.length > 0 && (
                <div>
                  <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>Engine</label>
                  <select
                    value={newPart.equipmentId || ""}
                    onChange={(e) => setNewPart(prev => ({ ...prev, equipmentId: e.target.value as Id<"vesselEquipment"> || undefined }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 ${
                      mode === 'dark'
                        ? "bg-black/20 border-white/10 text-white"
                        : "bg-white border-gray-300 text-black"
                    }`}
                  >
                    <option value="">No engine selected</option>
                    {vesselEngines.map((engine: any) => (
                      <option key={engine._id} value={engine._id}>
                        {engine.name || engine.make || "Engine"}{engine.model ? ` ${engine.model}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Serial Number */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>Serial Number</label>
                <input
                  type="text"
                  value={newPart.serialNumber || ""}
                  onChange={(e) => setNewPart(prev => ({ ...prev, serialNumber: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 font-mono ${
                    mode === 'dark' 
                      ? "bg-black/20 border-white/10 text-white placeholder-gray-500" 
                      : "bg-white border-gray-300 text-black placeholder-gray-400"
                  }`}
                  placeholder="Optional"
                />
              </div>

              {/* Quantity */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={newPart.quantity || 1}
                  onChange={(e) => setNewPart(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 ${
                    mode === 'dark' 
                      ? "bg-black/20 border-white/10 text-white" 
                      : "bg-white border-gray-300 text-black"
                  }`}
                />
              </div>

              {/* Unit Cost */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>Unit Cost ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newPart.unitCost || ""}
                  onChange={(e) => setNewPart(prev => ({ ...prev, unitCost: parseFloat(e.target.value) || 0 }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 ${
                    mode === 'dark' 
                      ? "bg-black/20 border-white/10 text-white placeholder-gray-500" 
                      : "bg-white border-gray-300 text-black placeholder-gray-400"
                  }`}
                  placeholder="0.00"
                />
              </div>

              {/* Photo Upload */}
              <div className="col-span-2">
                <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>Part Photo</label>
                <div className="flex items-center gap-4">
                  {newPart.photoPreview ? (
                    <div className="relative w-20 h-20">
                      <img
                        src={newPart.photoPreview}
                        alt="Part preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        onClick={() => setNewPart(prev => ({ ...prev, photoPreview: undefined, photoStorageId: undefined }))}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                        mode === 'dark'
                          ? "border-white/10 text-gray-300 hover:bg-white/10"
                          : "border-gray-300 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Add Photo
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Error message */}
            {addError && (
              <div className="rounded-lg px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {addError}
              </div>
            )}

            {/* Add Button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleAddPart}
                disabled={!newPart.name || isAdding}
                className="flex items-center gap-2 px-4 py-2 bg-captain-600 text-white rounded-lg hover:bg-captain-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isAdding ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Part
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Select Sections */}
      {!showManualEntry && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recently Used */}
          {recentParts && recentParts.length > 0 && (
            <div>
              <h4 className={`text-sm font-medium mb-2 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>Recently Used</h4>
              <div className="flex flex-wrap gap-2">
                {recentParts.slice(0, 5).map((part, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickSelect(part)}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors truncate max-w-[200px] ${
                      mode === 'dark'
                        ? "bg-white/10 hover:bg-white/20 text-gray-200"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                    title={`${part.name}${part.manufacturer ? ` - ${part.manufacturer}` : ""}`}
                  >
                    {part.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Vessel History */}
          {vesselHistory && vesselHistory.length > 0 && (
            <div>
              <h4 className={`text-sm font-medium mb-2 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>Previously on this Vessel</h4>
              <div className="space-y-1">
                {vesselHistory.slice(0, 3).map((part, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickSelect(part)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      mode === 'dark'
                        ? "bg-blue-500/10 hover:bg-blue-500/20"
                        : "bg-blue-50 hover:bg-blue-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium truncate ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{part.name}</span>
                      <span className={`text-xs ml-2 whitespace-nowrap ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                        {formatRelativeTime(part.lastUsed)}
                      </span>
                    </div>
                    {part.manufacturer && (
                      <span className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>{part.manufacturer}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Parts Added to Work Order */}
      {currentParts.length > 0 && (
        <div>
          <h4 className={`text-sm font-medium mb-3 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
            Parts Added ({currentParts.length})
          </h4>
          <div className="space-y-2">
            {currentParts.map((part: any) => (
              <div
                key={part._id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  mode === 'dark'
                    ? "bg-white/5 border-white/10"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{part.name}</span>
                    {part.partNumber && (
                      <span className={`text-sm font-mono ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>({part.partNumber})</span>
                    )}
                  </div>
                  <div className={`flex items-center gap-3 mt-1 text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>
                    {part.manufacturer && <span>{part.manufacturer}</span>}
                    <span>Qty: {part.quantity}</span>
                    {part.unitCost && (
                      <span className="font-medium">
                        ${(part.unitCost * part.quantity).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRemovePart(part._id)}
                  className={`p-2 transition-colors ${
                    mode === 'dark'
                      ? "text-gray-500 hover:text-red-400"
                      : "text-gray-400 hover:text-red-500"
                  }`}
                  title="Remove part"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}

            {/* Parts Total */}
            {currentParts.some((p: any) => p.unitCost) && (
              <div className={`flex justify-end pt-2 border-t mt-2 ${mode === 'dark' ? "border-white/10" : "border-gray-200"}`}>
                <div className="text-right">
                  <span className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>Parts Total: </span>
                  <span className={`text-lg font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
                    ${currentParts.reduce((sum: number, p: any) => sum + (p.unitCost || 0) * p.quantity, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
