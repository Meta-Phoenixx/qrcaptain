"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ImageCropper } from "./image-cropper";
import {
  Anchor,
  ChevronRight,
  ChevronLeft,
  Check,
  Camera,
  Zap,
  Battery,
  Navigation,
  Radio,
  Gauge,
  Ship,
  Plus,
  X,
} from "lucide-react";

interface VesselOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

// Common vessel types
const VESSEL_TYPES = [
  { value: "powerboat", label: "Powerboat", icon: "🚤" },
  { value: "sailboat", label: "Sailboat", icon: "⛵" },
  { value: "yacht", label: "Yacht", icon: "🛥️" },
  { value: "fishing", label: "Fishing Boat", icon: "🎣" },
  { value: "pontoon", label: "Pontoon", icon: "🚢" },
  { value: "jet_ski", label: "Jet Ski / PWC", icon: "🏄" },
  { value: "center_console", label: "Center Console", icon: "🚤" },
  { value: "cabin_cruiser", label: "Cabin Cruiser", icon: "🛳️" },
  { value: "other", label: "Other", icon: "⚓" },
];

// Common engine types
const ENGINE_TYPES = [
  "Outboard - Single",
  "Outboard - Twin",
  "Outboard - Triple",
  "Inboard - Single",
  "Inboard - Twin",
  "I/O (Sterndrive)",
  "Jet Drive",
  "Diesel",
];

// Common battery types
const BATTERY_TYPES = [
  "Lead Acid - Flooded",
  "AGM (Absorbed Glass Mat)",
  "Gel Cell",
  "Lithium (LiFePO4)",
  "Deep Cycle",
  "Starting/Cranking",
  "Dual Purpose",
];

// Common electronics
const ELECTRONICS_OPTIONS = [
  { id: "gps", label: "GPS/Chartplotter", icon: Navigation },
  { id: "vhf", label: "VHF Radio", icon: Radio },
  { id: "fishfinder", label: "Fish Finder/Sonar", icon: Gauge },
  { id: "radar", label: "Radar", icon: Gauge },
  { id: "autopilot", label: "Autopilot", icon: Ship },
  { id: "stereo", label: "Marine Stereo", icon: Zap },
];

type Step = 1 | 2;

export function VesselOnboarding({ onComplete, onSkip }: VesselOnboardingProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Photo upload state
  const vesselPhotoInputRef = useRef<HTMLInputElement>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [vesselPhotoBlob, setVesselPhotoBlob] = useState<Blob | null>(null);
  const [vesselPhotoPreview, setVesselPhotoPreview] = useState<string | null>(null);

  const createVessel = useMutation(api.vessels.createVessel);
  const addEquipment = useMutation(api.vesselEquipment.createEquipment);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const saveVesselImage = useMutation(api.storage.saveVesselImage);

  // Step 1: Vessel info
  const [vesselData, setVesselData] = useState({
    name: "",
    make: "",
    model: "",
    year: new Date().getFullYear().toString(),
    vesselType: "",
    registrationNumber: "",
    hullId: "",
  });

  // Step 2: Equipment info
  const [equipmentData, setEquipmentData] = useState({
    // Engine
    hasEngine: true,
    engineType: "",
    engineMake: "",
    engineModel: "",
    engineHorsepower: "",
    
    // Batteries
    hasBatteries: true,
    batteryType: "",
    batteryCount: "1",
    batteryMake: "",
    
    // Electronics
    selectedElectronics: [] as string[],
    gpsMake: "",
    gpsModel: "",
    vhfMake: "",
    fishfinderMake: "",
  });

  const updateVesselData = (field: string, value: string) => {
    setVesselData((prev) => ({ ...prev, [field]: value }));
  };

  const updateEquipmentData = (field: string, value: string | boolean | string[]) => {
    setEquipmentData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleElectronic = (id: string) => {
    setEquipmentData((prev) => ({
      ...prev,
      selectedElectronics: prev.selectedElectronics.includes(id)
        ? prev.selectedElectronics.filter((e) => e !== id)
        : [...prev.selectedElectronics, id],
    }));
  };

  // Handle photo file selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    setImageToCrop(imageUrl);
  };

  // Handle cropped image
  const handleCroppedImage = async (croppedBlob: Blob) => {
    setVesselPhotoBlob(croppedBlob);
    setVesselPhotoPreview(URL.createObjectURL(croppedBlob));
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
    }
    setImageToCrop(null);
    if (vesselPhotoInputRef.current) vesselPhotoInputRef.current.value = "";
  };

  // Cancel cropping
  const handleCropCancel = () => {
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
    }
    setImageToCrop(null);
    if (vesselPhotoInputRef.current) vesselPhotoInputRef.current.value = "";
  };

  const canProceedStep1 = () => {
    return (
      vesselData.name.trim() &&
      vesselData.make.trim() &&
      vesselData.model.trim() &&
      vesselData.year &&
      vesselData.vesselType
    );
  };

  const handleSubmit = async () => {
    if (!canProceedStep1()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Step 1: Create the vessel
      const { vesselId } = await createVessel({
        name: vesselData.name,
        make: vesselData.make,
        model: vesselData.model,
        year: parseInt(vesselData.year),
        vesselType: vesselData.vesselType,
        registrationNumber: vesselData.registrationNumber || undefined,
        hullId: vesselData.hullId || undefined,
      });

      // Upload vessel photo if present
      if (vesselPhotoBlob) {
        try {
          const uploadUrl = await generateUploadUrl();
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": "image/jpeg" },
            body: vesselPhotoBlob,
          });
          const { storageId } = await result.json();
          await saveVesselImage({ vesselId: vesselId, storageId });
        } catch (photoErr) {
          console.error("Failed to upload photo:", photoErr);
          // Continue without photo
        }
      }

      // Step 2: Add equipment (if any selected)
      const equipmentPromises: Promise<any>[] = [];

      // Add engine if specified
      if (equipmentData.hasEngine && equipmentData.engineType) {
        equipmentPromises.push(
          addEquipment({
            vesselId,
            category: "propulsion",
            name: equipmentData.engineType,
            manufacturer: equipmentData.engineMake || undefined,
            model: equipmentData.engineModel || undefined,
            notes: equipmentData.engineHorsepower
              ? `${equipmentData.engineHorsepower} HP`
              : undefined,
          })
        );
      }

      // Add batteries if specified
      if (equipmentData.hasBatteries && equipmentData.batteryType) {
        equipmentPromises.push(
          addEquipment({
            vesselId,
            category: "electrical",
            name: `${equipmentData.batteryType} Battery${parseInt(equipmentData.batteryCount) > 1 ? "s" : ""}`,
            manufacturer: equipmentData.batteryMake || undefined,
            notes: `Quantity: ${equipmentData.batteryCount}`,
          })
        );
      }

      // Add electronics
      if (equipmentData.selectedElectronics.includes("gps")) {
        equipmentPromises.push(
          addEquipment({
            vesselId,
            category: "electronics",
            name: "GPS/Chartplotter",
            manufacturer: equipmentData.gpsMake || undefined,
            model: equipmentData.gpsModel || undefined,
          })
        );
      }

      if (equipmentData.selectedElectronics.includes("vhf")) {
        equipmentPromises.push(
          addEquipment({
            vesselId,
            category: "electronics",
            name: "VHF Radio",
            manufacturer: equipmentData.vhfMake || undefined,
          })
        );
      }

      if (equipmentData.selectedElectronics.includes("fishfinder")) {
        equipmentPromises.push(
          addEquipment({
            vesselId,
            category: "electronics",
            name: "Fish Finder/Sonar",
            manufacturer: equipmentData.fishfinderMake || undefined,
          })
        );
      }

      if (equipmentData.selectedElectronics.includes("radar")) {
        equipmentPromises.push(
          addEquipment({
            vesselId,
            category: "electronics",
            name: "Radar",
          })
        );
      }

      if (equipmentData.selectedElectronics.includes("autopilot")) {
        equipmentPromises.push(
          addEquipment({
            vesselId,
            category: "electronics",
            name: "Autopilot",
          })
        );
      }

      if (equipmentData.selectedElectronics.includes("stereo")) {
        equipmentPromises.push(
          addEquipment({
            vesselId,
            category: "entertainment",
            name: "Marine Stereo",
          })
        );
      }

      // Execute all equipment additions
      if (equipmentPromises.length > 0) {
        await Promise.all(equipmentPromises);
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create vessel");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8">
      <div className="w-full max-w-2xl mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-captain-600 to-captain-700 px-6 py-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Anchor className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Add Your Vessel</h2>
                <p className="text-captain-100 text-sm">Let's set up your boat</p>
              </div>
            </div>
            <button
              onClick={onSkip}
              disabled={isSubmitting}
              className="text-sm text-captain-200 hover:text-white transition-colors"
            >
              Skip for now
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  currentStep >= 1
                    ? "bg-white/20 text-white ring-2 ring-white"
                    : "bg-white/10 text-white/60"
                }`}
              >
                <Ship size={20} />
              </div>
              <span className="text-sm ml-2">Vessel Info</span>
            </div>
            <div className={`flex-1 h-0.5 mx-4 ${currentStep > 1 ? "bg-white" : "bg-white/20"}`} />
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  currentStep >= 2
                    ? "bg-white/20 text-white ring-2 ring-white"
                    : "bg-white/10 text-white/60"
                }`}
              >
                <Zap size={20} />
              </div>
              <span className={`text-sm ml-2 ${currentStep < 2 ? "text-captain-200" : ""}`}>
                Equipment
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Step 1: Vessel Information */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              {/* Vessel Photo */}
              <div className="flex justify-center mb-4">
                <div className="relative">
                  {vesselPhotoPreview ? (
                    <img
                      src={vesselPhotoPreview}
                      alt="Vessel"
                      className="w-32 h-24 rounded-xl object-cover border-2 border-captain-200"
                    />
                  ) : (
                    <div
                      onClick={() => vesselPhotoInputRef.current?.click()}
                      className="w-32 h-24 rounded-xl bg-captain-50 border-2 border-dashed border-captain-200 flex flex-col items-center justify-center cursor-pointer hover:bg-captain-100 transition-colors"
                    >
                      <Camera className="w-6 h-6 text-captain-400 mb-1" />
                      <span className="text-xs text-captain-500">Add Photo</span>
                    </div>
                  )}
                  {vesselPhotoPreview && (
                    <button
                      onClick={() => {
                        setVesselPhotoBlob(null);
                        setVesselPhotoPreview(null);
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X size={14} />
                    </button>
                  )}
                  <input
                    ref={vesselPhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Vessel Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vessel Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={vesselData.name}
                  onChange={(e) => updateVesselData("name", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                  placeholder="e.g., Sea Breeze"
                />
              </div>

              {/* Make & Model */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Make <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={vesselData.make}
                    onChange={(e) => updateVesselData("make", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    placeholder="e.g., Boston Whaler"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={vesselData.model}
                    onChange={(e) => updateVesselData("model", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    placeholder="e.g., Outrage 330"
                  />
                </div>
              </div>

              {/* Year & Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    value={vesselData.year}
                    onChange={(e) => updateVesselData("year", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vessel Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={vesselData.vesselType}
                    onChange={(e) => updateVesselData("vesselType", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                  >
                    <option value="">Select type...</option>
                    {VESSEL_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optional: Registration & Hull ID */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration # <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={vesselData.registrationNumber}
                    onChange={(e) => updateVesselData("registrationNumber", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    placeholder="FL 1234 AB"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hull ID (HIN) <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={vesselData.hullId}
                    onChange={(e) => updateVesselData("hullId", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    placeholder="ABC12345D678"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Equipment */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <p className="text-sm text-gray-500">
                Add key equipment details now or skip and add later. This helps mechanics understand your boat.
              </p>

              {/* Engine Section */}
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-captain-600" />
                    <h3 className="font-medium text-gray-900">Engine / Propulsion</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={equipmentData.hasEngine}
                      onChange={(e) => updateEquipmentData("hasEngine", e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-10 h-6 rounded-full transition-colors ${
                        equipmentData.hasEngine ? "bg-captain-600" : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${
                          equipmentData.hasEngine ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </div>
                  </label>
                </div>

                {equipmentData.hasEngine && (
                  <div className="space-y-3">
                    <select
                      value={equipmentData.engineType}
                      onChange={(e) => updateEquipmentData("engineType", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    >
                      <option value="">Select engine type...</option>
                      {ENGINE_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={equipmentData.engineMake}
                        onChange={(e) => updateEquipmentData("engineMake", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black text-sm focus:border-captain-500 focus:outline-none"
                        placeholder="Make (e.g., Yamaha)"
                      />
                      <input
                        type="text"
                        value={equipmentData.engineModel}
                        onChange={(e) => updateEquipmentData("engineModel", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black text-sm focus:border-captain-500 focus:outline-none"
                        placeholder="Model"
                      />
                      <input
                        type="text"
                        value={equipmentData.engineHorsepower}
                        onChange={(e) => updateEquipmentData("engineHorsepower", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black text-sm focus:border-captain-500 focus:outline-none"
                        placeholder="HP"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Batteries Section */}
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Battery className="w-5 h-5 text-captain-600" />
                    <h3 className="font-medium text-gray-900">Batteries</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={equipmentData.hasBatteries}
                      onChange={(e) => updateEquipmentData("hasBatteries", e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-10 h-6 rounded-full transition-colors ${
                        equipmentData.hasBatteries ? "bg-captain-600" : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${
                          equipmentData.hasBatteries ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </div>
                  </label>
                </div>

                {equipmentData.hasBatteries && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={equipmentData.batteryType}
                        onChange={(e) => updateEquipmentData("batteryType", e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                      >
                        <option value="">Select battery type...</option>
                        {BATTERY_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={equipmentData.batteryCount}
                        onChange={(e) => updateEquipmentData("batteryCount", e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                        placeholder="# of batteries"
                      />
                    </div>
                    <input
                      type="text"
                      value={equipmentData.batteryMake}
                      onChange={(e) => updateEquipmentData("batteryMake", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black text-sm focus:border-captain-500 focus:outline-none"
                      placeholder="Brand (e.g., Optima, Interstate)"
                    />
                  </div>
                )}
              </div>

              {/* Electronics Section */}
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Navigation className="w-5 h-5 text-captain-600" />
                  <h3 className="font-medium text-gray-900">Electronics</h3>
                  <span className="text-xs text-gray-400">(select what you have)</span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  {ELECTRONICS_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = equipmentData.selectedElectronics.includes(option.id);
                    return (
                      <label
                        key={option.id}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-captain-50 border-captain-300"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleElectronic(option.id)}
                          className="sr-only"
                        />
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isSelected ? "bg-captain-600 border-captain-600" : "border-gray-300"
                          }`}
                        >
                          {isSelected && <Check size={12} className="text-white" />}
                        </div>
                        <Icon size={16} className={isSelected ? "text-captain-600" : "text-gray-400"} />
                        <span className="text-sm text-gray-700">{option.label}</span>
                      </label>
                    );
                  })}
                </div>

                {/* GPS Details */}
                {equipmentData.selectedElectronics.includes("gps") && (
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      type="text"
                      value={equipmentData.gpsMake}
                      onChange={(e) => updateEquipmentData("gpsMake", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black text-sm focus:border-captain-500 focus:outline-none"
                      placeholder="GPS Make (e.g., Garmin)"
                    />
                    <input
                      type="text"
                      value={equipmentData.gpsModel}
                      onChange={(e) => updateEquipmentData("gpsModel", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black text-sm focus:border-captain-500 focus:outline-none"
                      placeholder="GPS Model"
                    />
                  </div>
                )}

                {/* VHF Details */}
                {equipmentData.selectedElectronics.includes("vhf") && (
                  <input
                    type="text"
                    value={equipmentData.vhfMake}
                    onChange={(e) => updateEquipmentData("vhfMake", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black text-sm focus:border-captain-500 focus:outline-none mb-2"
                    placeholder="VHF Radio Make/Model"
                  />
                )}

                {/* Fish Finder Details */}
                {equipmentData.selectedElectronics.includes("fishfinder") && (
                  <input
                    type="text"
                    value={equipmentData.fishfinderMake}
                    onChange={(e) => updateEquipmentData("fishfinderMake", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black text-sm focus:border-captain-500 focus:outline-none mb-2"
                    placeholder="Fish Finder Make/Model"
                  />
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-between bg-gray-50">
          {currentStep > 1 ? (
            <button
              onClick={() => setCurrentStep((prev) => (prev - 1) as Step)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={18} />
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < 2 ? (
            <button
              onClick={() => setCurrentStep(2)}
              disabled={!canProceedStep1()}
              className="flex items-center gap-2 px-6 py-2.5 bg-captain-600 text-white rounded-lg hover:bg-captain-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-captain-600 text-white rounded-lg hover:bg-captain-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Vessel
                  <Check size={18} />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Image Cropper Modal */}
      {imageToCrop && (
        <ImageCropper
          imageSrc={imageToCrop}
          onCropComplete={handleCroppedImage}
          onCancel={handleCropCancel}
          aspectRatio={16 / 9}
        />
      )}
    </div>
  );
}

export default VesselOnboarding;
