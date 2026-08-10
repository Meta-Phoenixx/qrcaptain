"use client";

import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { ImageCropper } from "./image-cropper";
import { GlassModal, GlassButton, GlassInput, GlassSelect } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";
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
  /** When provided, flow updates the existing vessel instead of creating a new one */
  existingVesselId?: Id<"vessels">;
}

// Common vessel types
const VESSEL_TYPES = [
  { value: "powerboat", label: "Powerboat" },
  { value: "sailboat", label: "Sailboat" },
  { value: "yacht", label: "Yacht" },
  { value: "fishing", label: "Fishing Boat" },
  { value: "pontoon", label: "Pontoon" },
  { value: "jet_ski", label: "Jet Ski / PWC" },
  { value: "center_console", label: "Center Console" },
  { value: "cabin_cruiser", label: "Cabin Cruiser" },
  { value: "other", label: "Other" },
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

export function VesselOnboarding({ onComplete, onSkip, existingVesselId }: VesselOnboardingProps) {
  const { mode } = useTheme();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Photo upload state
  const vesselPhotoInputRef = useRef<HTMLInputElement>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [vesselPhotoBlob, setVesselPhotoBlob] = useState<Blob | null>(null);
  const [vesselPhotoPreview, setVesselPhotoPreview] = useState<string | null>(null);

  const createVessel = useMutation(api.vessels.createVessel);
  const updateVessel = useMutation(api.vessels.updateVessel);
  const addEquipment = useMutation(api.vesselEquipment.createEquipment);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const saveVesselImage = useMutation(api.storage.saveVesselImage);

  // Pre-load existing vessel data when editing
  const existingVessel = useQuery(
    existingVesselId ? (api as any).vessels.getVessel : "skip",
    existingVesselId ? { vesselId: existingVesselId } : "skip"
  );

  // Step 1: Vessel info — pre-populated from existing vessel if present
  const [vesselData, setVesselData] = useState({
    name: "",
    make: "",
    model: "",
    year: new Date().getFullYear().toString(),
    vesselType: "",
    registrationNumber: "",
    hullId: "",
  });

  // Once existing vessel loads, populate the form (runs once)
  const [prefilled, setPrefilled] = useState(false);
  if (existingVessel && !prefilled) {
    setVesselData({
      name: existingVessel.name ?? "",
      make: existingVessel.make ?? "",
      model: existingVessel.model ?? "",
      year: String(existingVessel.year ?? new Date().getFullYear()),
      vesselType: existingVessel.vesselType ?? "",
      registrationNumber: existingVessel.registrationNumber ?? "",
      hullId: existingVessel.hullId ?? "",
    });
    setPrefilled(true);
  }

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
      let vesselId: Id<"vessels">;

      if (existingVesselId) {
        // Update the existing vessel with the completed info
        await updateVessel({
          vesselId: existingVesselId,
          name: vesselData.name,
          make: vesselData.make,
          model: vesselData.model,
          year: parseInt(vesselData.year),
          vesselType: vesselData.vesselType,
          registrationNumber: vesselData.registrationNumber || undefined,
          hullId: vesselData.hullId || undefined,
        });
        vesselId = existingVesselId;
      } else {
        // Create a brand-new vessel
        const result = await createVessel({
          name: vesselData.name,
          make: vesselData.make,
          model: vesselData.model,
          year: parseInt(vesselData.year),
          vesselType: vesselData.vesselType,
          registrationNumber: vesselData.registrationNumber || undefined,
          hullId: vesselData.hullId || undefined,
        });
        vesselId = result.vesselId;
      }

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
          await saveVesselImage({ vesselId, storageId });
        } catch (photoErr) {
          console.error("Failed to upload photo:", photoErr);
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
      setError(err instanceof Error ? err.message : existingVesselId ? "Failed to update vessel" : "Failed to create vessel");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <GlassModal onClose={onSkip} className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-5 flex-shrink-0 ${mode === 'dark' ? "bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border-b border-white/10" : "bg-gradient-to-r from-captain-600 to-captain-700 text-white"}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mode === 'dark' ? "bg-white/10" : "bg-white/20"}`}>
                <Anchor className={`w-6 h-6 ${mode === 'dark' ? "text-white" : ""}`} />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${mode === 'dark' ? "text-white" : ""}`}>{existingVesselId ? "Complete Vessel Setup" : "Add Your Vessel"}</h2>
                <p className={`text-sm ${mode === 'dark' ? "text-gray-300" : "text-captain-100"}`}>{existingVesselId ? "Fill in the remaining details" : "Let's set up your boat"}</p>
              </div>
            </div>
            <button
              onClick={onSkip}
              disabled={isSubmitting}
              className={`text-sm transition-colors ${mode === 'dark' ? "text-gray-400 hover:text-white" : "text-captain-200 hover:text-white"}`}
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
                    ? mode === 'dark' ? "bg-white/20 text-white ring-2 ring-blue-500" : "bg-white/20 text-white ring-2 ring-white"
                    : mode === 'dark' ? "bg-white/10 text-gray-500" : "bg-white/10 text-white/60"
                }`}
              >
                <Ship size={20} />
              </div>
              <span className={`text-sm ml-2 ${mode === 'dark' ? "text-white" : ""}`}>Vessel Info</span>
            </div>
            <div className={`flex-1 h-0.5 mx-4 ${currentStep > 1 ? (mode === 'dark' ? "bg-blue-500" : "bg-white") : (mode === 'dark' ? "bg-white/10" : "bg-white/20")}`} />
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  currentStep >= 2
                    ? mode === 'dark' ? "bg-white/20 text-white ring-2 ring-blue-500" : "bg-white/20 text-white ring-2 ring-white"
                    : mode === 'dark' ? "bg-white/10 text-gray-500" : "bg-white/10 text-white/60"
                }`}
              >
                <Zap size={20} />
              </div>
              <span className={`text-sm ml-2 ${currentStep < 2 ? (mode === 'dark' ? "text-gray-500" : "text-captain-200") : (mode === 'dark' ? "text-white" : "")}`}>
                Equipment
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
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
                      className={`w-32 h-24 rounded-xl object-cover border-2 ${mode === 'dark' ? "border-blue-500/50" : "border-captain-200"}`}
                    />
                  ) : (
                    <div
                      onClick={() => vesselPhotoInputRef.current?.click()}
                      className={`w-32 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
                        mode === 'dark' 
                          ? "bg-white/5 border-white/20 hover:bg-white/10" 
                          : "bg-captain-50 border-captain-200 hover:bg-captain-100"
                      }`}
                    >
                      <Camera className={`w-6 h-6 mb-1 ${mode === 'dark' ? "text-gray-400" : "text-captain-400"}`} />
                      <span className={`text-xs ${mode === 'dark' ? "text-gray-400" : "text-captain-500"}`}>Add Photo</span>
                    </div>
                  )}
                  {vesselPhotoPreview && (
                    <button
                      onClick={() => {
                        setVesselPhotoBlob(null);
                        setVesselPhotoPreview(null);
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
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
                <GlassInput
                  label="Vessel Name"
                  required
                  value={vesselData.name}
                  onChange={(e) => updateVesselData("name", e.target.value)}
                  placeholder="e.g., Sea Breeze"
                />
              </div>

              {/* Make & Model */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <GlassInput
                    label="Make"
                    required
                    value={vesselData.make}
                    onChange={(e) => updateVesselData("make", e.target.value)}
                    placeholder="e.g., Boston Whaler"
                  />
                </div>
                <div>
                  <GlassInput
                    label="Model"
                    required
                    value={vesselData.model}
                    onChange={(e) => updateVesselData("model", e.target.value)}
                    placeholder="e.g., Outrage 330"
                  />
                </div>
              </div>

              {/* Year & Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <GlassInput
                    label="Year"
                    required
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    value={vesselData.year}
                    onChange={(e) => updateVesselData("year", e.target.value)}
                  />
                </div>
                <div>
                  <GlassSelect
                    required
                    value={vesselData.vesselType}
                    onChange={(e) => updateVesselData("vesselType", e.target.value)}
                  >
                    <option value="">Select type...</option>
                    {VESSEL_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </GlassSelect>
                </div>
              </div>

              {/* Optional: Registration & Hull ID */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <GlassInput
                    label={
                      <span>
                        Registration # <span className={mode === 'dark' ? "text-gray-500" : "text-gray-400"}>(optional)</span>
                      </span>
                    }
                    value={vesselData.registrationNumber}
                    onChange={(e) => updateVesselData("registrationNumber", e.target.value)}
                    placeholder="FL 1234 AB"
                  />
                </div>
                <div>
                  <GlassInput
                    label={
                      <span>
                        Hull ID (HIN) <span className={mode === 'dark' ? "text-gray-500" : "text-gray-400"}>(optional)</span>
                      </span>
                    }
                    value={vesselData.hullId}
                    onChange={(e) => updateVesselData("hullId", e.target.value)}
                    placeholder="ABC12345D678"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Equipment */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <p className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                Add key equipment details now or skip and add later. This helps mechanics understand your boat.
              </p>

              {/* Engine Section */}
              <div className={`border rounded-xl p-4 transition-colors ${mode === 'dark' ? "border-white/10 bg-white/5" : "border-gray-200 bg-white"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className={`w-5 h-5 ${mode === 'dark' ? "text-blue-400" : "text-captain-600"}`} />
                    <h3 className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Engine / Propulsion</h3>
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
                        equipmentData.hasEngine 
                          ? mode === 'dark' ? "bg-blue-500" : "bg-captain-600" 
                          : mode === 'dark' ? "bg-white/10" : "bg-gray-300"
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
                    <GlassSelect
                      value={equipmentData.engineType}
                      onChange={(e) => updateEquipmentData("engineType", e.target.value)}
                    >
                      <option value="">Select engine type...</option>
                      {ENGINE_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </GlassSelect>
                    <div className="grid grid-cols-3 gap-2">
                      <GlassInput
                        value={equipmentData.engineMake}
                        onChange={(e) => updateEquipmentData("engineMake", e.target.value)}
                        placeholder="Make (e.g., Yamaha)"
                        className="text-sm"
                      />
                      <GlassInput
                        value={equipmentData.engineModel}
                        onChange={(e) => updateEquipmentData("engineModel", e.target.value)}
                        placeholder="Model"
                        className="text-sm"
                      />
                      <GlassInput
                        value={equipmentData.engineHorsepower}
                        onChange={(e) => updateEquipmentData("engineHorsepower", e.target.value)}
                        placeholder="HP"
                        className="text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Batteries Section */}
              <div className={`border rounded-xl p-4 transition-colors ${mode === 'dark' ? "border-white/10 bg-white/5" : "border-gray-200 bg-white"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Battery className={`w-5 h-5 ${mode === 'dark' ? "text-blue-400" : "text-captain-600"}`} />
                    <h3 className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Batteries</h3>
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
                        equipmentData.hasBatteries 
                          ? mode === 'dark' ? "bg-blue-500" : "bg-captain-600"
                          : mode === 'dark' ? "bg-white/10" : "bg-gray-300"
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
                      <GlassSelect
                        value={equipmentData.batteryType}
                        onChange={(e) => updateEquipmentData("batteryType", e.target.value)}
                      >
                        <option value="">Select battery type...</option>
                        {BATTERY_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </GlassSelect>
                      <GlassInput
                        type="number"
                        min="1"
                        max="10"
                        value={equipmentData.batteryCount}
                        onChange={(e) => updateEquipmentData("batteryCount", e.target.value)}
                        placeholder="# of batteries"
                      />
                    </div>
                    <GlassInput
                      value={equipmentData.batteryMake}
                      onChange={(e) => updateEquipmentData("batteryMake", e.target.value)}
                      placeholder="Brand (e.g., Optima, Interstate)"
                      className="text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Electronics Section */}
              <div className={`border rounded-xl p-4 transition-colors ${mode === 'dark' ? "border-white/10 bg-white/5" : "border-gray-200 bg-white"}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Navigation className={`w-5 h-5 ${mode === 'dark' ? "text-blue-400" : "text-captain-600"}`} />
                  <h3 className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Electronics</h3>
                  <span className={`text-xs ${mode === 'dark' ? "text-gray-400" : "text-gray-400"}`}>(select what you have)</span>
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
                            ? mode === 'dark' ? "bg-blue-500/20 border-blue-500/50" : "bg-captain-50 border-captain-300"
                            : mode === 'dark' ? "bg-white/5 border-white/10 hover:border-white/20" : "bg-white border-gray-200 hover:border-gray-300"
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
                            isSelected 
                              ? mode === 'dark' ? "bg-blue-500 border-blue-500" : "bg-captain-600 border-captain-600"
                              : mode === 'dark' ? "border-white/20" : "border-gray-300"
                          }`}
                        >
                          {isSelected && <Check size={12} className="text-white" />}
                        </div>
                        <Icon size={16} className={isSelected ? (mode === 'dark' ? "text-blue-400" : "text-captain-600") : (mode === 'dark' ? "text-gray-400" : "text-gray-400")} />
                        <span className={`text-sm ${mode === 'dark' ? "text-gray-200" : "text-gray-700"}`}>{option.label}</span>
                      </label>
                    );
                  })}
                </div>

                {/* GPS Details */}
                {equipmentData.selectedElectronics.includes("gps") && (
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <GlassInput
                      value={equipmentData.gpsMake}
                      onChange={(e) => updateEquipmentData("gpsMake", e.target.value)}
                      placeholder="GPS Make (e.g., Garmin)"
                      className="text-sm"
                    />
                    <GlassInput
                      value={equipmentData.gpsModel}
                      onChange={(e) => updateEquipmentData("gpsModel", e.target.value)}
                      placeholder="GPS Model"
                      className="text-sm"
                    />
                  </div>
                )}

                {/* VHF Details */}
                {equipmentData.selectedElectronics.includes("vhf") && (
                  <div className="mb-2">
                    <GlassInput
                      value={equipmentData.vhfMake}
                      onChange={(e) => updateEquipmentData("vhfMake", e.target.value)}
                      placeholder="VHF Radio Make/Model"
                      className="text-sm"
                    />
                  </div>
                )}

                {/* Fish Finder Details */}
                {equipmentData.selectedElectronics.includes("fishfinder") && (
                  <div className="mb-2">
                    <GlassInput
                      value={equipmentData.fishfinderMake}
                      onChange={(e) => updateEquipmentData("fishfinderMake", e.target.value)}
                      placeholder="Fish Finder Make/Model"
                      className="text-sm"
                    />
                  </div>
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
        <div className={`px-6 py-4 flex justify-between flex-shrink-0 border-t ${mode === 'dark' ? "bg-gray-900/50 border-white/10" : "bg-gray-50 border-gray-200"}`}>
          {currentStep > 1 ? (
            <GlassButton
              variant="secondary"
              onClick={() => setCurrentStep((prev) => (prev - 1) as Step)}
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              <ChevronLeft size={18} />
              Back
            </GlassButton>
          ) : (
            <div />
          )}

          {currentStep < 2 ? (
            <GlassButton
              variant="primary"
              onClick={() => setCurrentStep(2)}
              disabled={!canProceedStep1()}
              className="flex items-center gap-2"
            >
              Continue
              <ChevronRight size={18} />
            </GlassButton>
          ) : (
            <GlassButton
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {existingVesselId ? "Saving..." : "Creating..."}
                </>
              ) : (
                <>
                  {existingVesselId ? "Update Vessel" : "Create Vessel"}
                  <Check size={18} />
                </>
              )}
            </GlassButton>
          )}
        </div>
      </GlassModal>

      {/* Image Cropper Modal */}
      {imageToCrop && (
        <ImageCropper
          imageSrc={imageToCrop}
          onCropComplete={handleCroppedImage}
          onCancel={handleCropCancel}
          aspectRatio={16 / 9}
        />
      )}
    </>
  );
}

export default VesselOnboarding;
