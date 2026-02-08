"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { GlassModal, GlassButton, GlassInput } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";
import {
  Building2,
  MapPin,
  Clock,
  Award,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Wrench,
  Globe,
  Shield,
  Truck,
  Languages,
} from "lucide-react";

// Common service areas for marine mechanics (Florida focus with national coverage)
const SERVICE_AREA_SUGGESTIONS = [
  // Tampa Bay Area
  "Tampa", "St. Petersburg", "Clearwater", "Apollo Beach", "Ruskin", "Brandon",
  "Riverview", "Sun City Center", "Gibsonton", "Safety Harbor", "Dunedin",
  "Tarpon Springs", "Palm Harbor", "Oldsmar", "Temple Terrace",
  // Southwest Florida
  "Sarasota", "Bradenton", "Venice", "Englewood", "Port Charlotte", "Punta Gorda",
  "Fort Myers", "Cape Coral", "Bonita Springs", "Naples", "Marco Island",
  "Sanibel Island", "Captiva Island", "Fort Myers Beach",
  // Southeast Florida
  "Miami", "Miami Beach", "Fort Lauderdale", "Hollywood", "Pompano Beach",
  "Boca Raton", "Deerfield Beach", "West Palm Beach", "Palm Beach", "Jupiter",
  "Stuart", "Port St. Lucie", "Vero Beach", "Key Biscayne", "Coconut Grove",
  "Key West", "Key Largo", "Islamorada", "Marathon",
  // Central Florida
  "Orlando", "Kissimmee", "Sanford", "Lake Mary", "Winter Park",
  // East Central Florida
  "Daytona Beach", "New Smyrna Beach", "Cocoa Beach", "Melbourne", "Titusville",
  "Palm Bay", "Sebastian", "Fort Pierce",
  // Northeast Florida
  "Jacksonville", "St. Augustine", "Fernandina Beach", "Ponte Vedra Beach",
  "Orange Park", "Fleming Island", "Green Cove Springs",
  // Northwest Florida (Panhandle)
  "Pensacola", "Destin", "Fort Walton Beach", "Panama City", "Panama City Beach",
  "Apalachicola", "Tallahassee",
  // Other States - Gulf Coast
  "Mobile, AL", "Gulf Shores, AL", "Orange Beach, AL",
  "Biloxi, MS", "Gulfport, MS", "Ocean Springs, MS",
  "New Orleans, LA", "Slidell, LA", "Mandeville, LA",
  "Houston, TX", "Galveston, TX", "Kemah, TX", "League City, TX",
  // Other States - East Coast
  "Savannah, GA", "Brunswick, GA", "St. Simons Island, GA",
  "Charleston, SC", "Hilton Head, SC", "Myrtle Beach, SC",
  "Wilmington, NC", "Morehead City, NC", "Outer Banks, NC",
  "Virginia Beach, VA", "Norfolk, VA", "Hampton, VA",
  "Annapolis, MD", "Baltimore, MD", "Ocean City, MD",
  // Generic/Regional
  "Tampa Bay Area", "Florida Keys", "Space Coast", "Treasure Coast",
  "Gold Coast", "Emerald Coast", "Nature Coast", "First Coast",
  "Paradise Coast", "Suncoast", "Palm Beaches",
];

interface MechanicOnboardingProps {
  userName: string;
  companyName: string;
  onComplete: () => void;
  onSkip: () => void;
}

// Common service types for marine mechanics
const SERVICE_TYPE_OPTIONS = [
  "Engine Repair & Maintenance",
  "Outboard Motors",
  "Inboard Motors",
  "Diesel Engines",
  "Electrical Systems",
  "Electronics & Navigation",
  "Fiberglass Repair",
  "Gel Coat Repair",
  "Bottom Paint & Anti-fouling",
  "Canvas & Upholstery",
  "Plumbing & Water Systems",
  "HVAC & Air Conditioning",
  "Hull Repair",
  "Propeller Service",
  "Trailer Service",
  "Winterization",
  "Detailing",
  "Rigging (Sailboats)",
  "Fuel Systems",
  "Steering Systems",
];

// Common certifications
const CERTIFICATION_OPTIONS = [
  "EPA Section 608 Certified",
  "Yamaha Certified",
  "Mercury Certified",
  "Honda Marine Certified",
  "Suzuki Marine Certified",
  "Volvo Penta Certified",
  "MerCruiser Certified",
  "Cummins Certified",
  "ABYC Certified",
  "NMEA Certified",
  "ASE Certified",
  "Factory Trained",
];

// Common specializations
const SPECIALIZATION_OPTIONS = [
  "Powerboats",
  "Sailboats",
  "Pontoon Boats",
  "Personal Watercraft (PWC)",
  "Fishing Boats",
  "Yachts",
  "Commercial Vessels",
  "Outboard Motors",
  "Inboard Motors",
  "Diesel Engines",
  "High Performance",
  "Classic/Vintage Boats",
];

type Step = 1 | 2 | 3 | 4;

export function MechanicOnboarding({
  userName,
  companyName,
  onComplete,
  onSkip,
}: MechanicOnboardingProps) {
  const { mode } = useTheme();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const serviceAreaInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const completeOnboarding = useMutation(api.users.completeMechanicOnboarding);
  const skipOnboarding = useMutation(api.users.skipMechanicOnboarding);

  // Form state
  const [formData, setFormData] = useState({
    // Step 1: Business Info
    businessYearsInOperation: "",
    businessLicenseNumber: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    // Step 2: Services
    serviceAreas: [] as string[],
    serviceAreaInput: "",
    serviceTypes: [] as string[],
    // Step 3: Hours
    hoursOfOperation: {
      monday: { open: "08:00", close: "17:00", closed: false },
      tuesday: { open: "08:00", close: "17:00", closed: false },
      wednesday: { open: "08:00", close: "17:00", closed: false },
      thursday: { open: "08:00", close: "17:00", closed: false },
      friday: { open: "08:00", close: "17:00", closed: false },
      saturday: { open: "09:00", close: "14:00", closed: false },
      sunday: { open: "09:00", close: "14:00", closed: true },
    },
    // Step 4: Optional
    certifications: [] as string[],
    googleMyBusinessUrl: "",
    websiteUrl: "",
    isInsured: false,
    isBonded: false,
    specializations: [] as string[],
    hasMobileCapabilities: true,
    languagesSpoken: ["English"] as string[],
    languageInput: "",
    bio: "",
  });

  // Filter suggestions based on input (must be after formData is declared)
  const filteredSuggestions = formData.serviceAreaInput.trim()
    ? SERVICE_AREA_SUGGESTIONS.filter(
        (area) =>
          area.toLowerCase().includes(formData.serviceAreaInput.toLowerCase()) &&
          !formData.serviceAreas.some(
            (existing) => existing.toLowerCase() === area.toLowerCase()
          )
      ).slice(0, 8)
    : [];

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        serviceAreaInputRef.current &&
        !serviceAreaInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateFormData = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addServiceArea = (specificArea?: string) => {
    const inputValue = specificArea || formData.serviceAreaInput;
    
    // Split by comma and process each area
    const areasToAdd = inputValue
      .split(",")
      .map((area) => area.trim())
      .filter((area) => area.length > 0);
    
    const newAreas = areasToAdd.filter(
      (area) =>
        !formData.serviceAreas.some(
          (existing) => existing.toLowerCase() === area.toLowerCase()
        )
    );
    
    if (newAreas.length > 0) {
      updateFormData("serviceAreas", [...formData.serviceAreas, ...newAreas]);
    }
    
    updateFormData("serviceAreaInput", "");
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };
  
  const selectSuggestion = (suggestion: string) => {
    addServiceArea(suggestion);
    serviceAreaInputRef.current?.focus();
  };
  
  const handleServiceAreaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        selectSuggestion(filteredSuggestions[highlightedIndex]);
      } else {
        addServiceArea();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const removeServiceArea = (area: string) => {
    updateFormData("serviceAreas", formData.serviceAreas.filter((a) => a !== area));
  };

  const toggleServiceType = (type: string) => {
    if (formData.serviceTypes.includes(type)) {
      updateFormData("serviceTypes", formData.serviceTypes.filter((t) => t !== type));
    } else {
      updateFormData("serviceTypes", [...formData.serviceTypes, type]);
    }
  };

  const toggleCertification = (cert: string) => {
    if (formData.certifications.includes(cert)) {
      updateFormData("certifications", formData.certifications.filter((c) => c !== cert));
    } else {
      updateFormData("certifications", [...formData.certifications, cert]);
    }
  };

  const toggleSpecialization = (spec: string) => {
    if (formData.specializations.includes(spec)) {
      updateFormData("specializations", formData.specializations.filter((s) => s !== spec));
    } else {
      updateFormData("specializations", [...formData.specializations, spec]);
    }
  };

  const addLanguage = () => {
    if (formData.languageInput.trim() && !formData.languagesSpoken.includes(formData.languageInput.trim())) {
      updateFormData("languagesSpoken", [...formData.languagesSpoken, formData.languageInput.trim()]);
      updateFormData("languageInput", "");
    }
  };

  const removeLanguage = (lang: string) => {
    updateFormData("languagesSpoken", formData.languagesSpoken.filter((l) => l !== lang));
  };

  const updateHours = (day: string, field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      hoursOfOperation: {
        ...prev.hoursOfOperation,
        [day]: { ...prev.hoursOfOperation[day as keyof typeof prev.hoursOfOperation], [field]: value },
      },
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return (
          formData.businessYearsInOperation &&
          formData.businessLicenseNumber &&
          formData.street &&
          formData.city &&
          formData.state &&
          formData.zipCode
        );
      case 2:
        return formData.serviceAreas.length > 0 && formData.serviceTypes.length > 0;
      case 3:
        return true; // Hours have defaults
      case 4:
        return true; // All optional
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await completeOnboarding({
        businessYearsInOperation: parseInt(formData.businessYearsInOperation),
        businessLicenseNumber: formData.businessLicenseNumber,
        businessAddress: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
        },
        serviceAreas: formData.serviceAreas,
        serviceTypes: formData.serviceTypes,
        hoursOfOperation: formData.hoursOfOperation,
        certifications: formData.certifications.length > 0 ? formData.certifications : undefined,
        googleMyBusinessUrl: formData.googleMyBusinessUrl || undefined,
        websiteUrl: formData.websiteUrl || undefined,
        isInsured: formData.isInsured || undefined,
        isBonded: formData.isBonded || undefined,
        specializations: formData.specializations.length > 0 ? formData.specializations : undefined,
        hasMobileCapabilities: formData.hasMobileCapabilities,
        languagesSpoken: formData.languagesSpoken.length > 0 ? formData.languagesSpoken : undefined,
        bio: formData.bio || undefined,
      });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete onboarding");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      await skipOnboarding({});
      onSkip();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to skip onboarding");
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: "Business Info", icon: Building2 },
    { num: 2, title: "Services", icon: Wrench },
    { num: 3, title: "Hours", icon: Clock },
    { num: 4, title: "Extras", icon: Award },
  ];

  return (
    <GlassModal onClose={handleSkip} className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-5 flex-shrink-0 ${mode === 'dark' ? "bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border-b border-white/10" : "bg-gradient-to-r from-captain-600 to-captain-700 text-white"}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-xl font-bold ${mode === 'dark' ? "text-white" : "text-white"}`}>Welcome to QR Captain!</h2>
            <p className={`text-sm ${mode === 'dark' ? "text-gray-300" : "text-captain-100"}`}>
              Let's set up your mechanic profile, {userName.split(" ")[0]}
            </p>
          </div>
          <button
            onClick={handleSkip}
            disabled={isSubmitting}
            className={`text-sm transition-colors ${mode === 'dark' ? "text-gray-400 hover:text-white" : "text-captain-200 hover:text-white"}`}
          >
            Skip for now
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.num;
            const isCompleted = currentStep > step.num;

            return (
              <div key={step.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? mode === 'dark' ? "bg-blue-500 text-white" : "bg-white text-captain-600"
                        : isActive
                        ? mode === 'dark' ? "bg-white/20 text-white ring-2 ring-blue-500" : "bg-white/20 text-white ring-2 ring-white"
                        : mode === 'dark' ? "bg-white/10 text-gray-500" : "bg-white/10 text-white/60"
                    }`}
                  >
                    {isCompleted ? <Check size={20} /> : <StepIcon size={20} />}
                  </div>
                  <span
                    className={`text-xs mt-1 ${
                      isActive ? "text-white" : mode === 'dark' ? "text-gray-500" : "text-captain-200"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-2 ${
                      isCompleted ? (mode === 'dark' ? "bg-blue-500" : "bg-white") : (mode === 'dark' ? "bg-white/10" : "bg-white/20")
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
        {/* Step 1: Business Information */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h3 className={`text-lg font-semibold mb-1 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
                Business Information
              </h3>
              <p className={`text-sm mb-4 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                Tell us about {companyName}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <GlassInput
                  label="Years in Business *"
                  type="number"
                  min="0"
                  value={formData.businessYearsInOperation}
                  onChange={(e) => updateFormData("businessYearsInOperation", e.target.value)}
                  placeholder="5"
                />
              </div>
              <div>
                <GlassInput
                  label="Business License # *"
                  value={formData.businessLicenseNumber}
                  onChange={(e) => updateFormData("businessLicenseNumber", e.target.value)}
                  placeholder="BL-123456"
                />
              </div>
            </div>

            <div>
              <div className="mb-2">
                <GlassInput
                  label={
                    <>
                      <MapPin size={14} className="inline mr-1" />
                      Business Address <span className="text-red-500">*</span>
                    </>
                  }
                  value={formData.street}
                  onChange={(e) => updateFormData("street", e.target.value)}
                  placeholder="Street Address"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <GlassInput
                  value={formData.city}
                  onChange={(e) => updateFormData("city", e.target.value)}
                  placeholder="City"
                />
                <GlassInput
                  value={formData.state}
                  onChange={(e) => updateFormData("state", e.target.value)}
                  placeholder="State"
                />
                <GlassInput
                  value={formData.zipCode}
                  onChange={(e) => updateFormData("zipCode", e.target.value)}
                  placeholder="ZIP"
                />
              </div>
            </div>
          </div>
        )}

          {/* Step 2: Service Areas & Types */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className={`text-lg font-semibold mb-1 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
                  Services & Coverage
                </h3>
                <p className={`text-sm mb-4 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                  What areas do you serve and what services do you offer?
                </p>
              </div>

              {/* Service Areas */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                  <MapPin size={14} className="inline mr-1" />
                  Service Areas <span className="text-red-500">*</span>
                  <span className={`font-normal ml-1 ${mode === 'dark' ? "text-gray-500" : "text-gray-500"}`}>
                    (cities, regions, or marinas you serve)
                  </span>
                </label>
                <div className="relative">
                  <div className="flex gap-2 mb-2">
                    <div className="relative flex-1">
                      <GlassInput
                        ref={serviceAreaInputRef}
                        value={formData.serviceAreaInput}
                        onChange={(e) => {
                          updateFormData("serviceAreaInput", e.target.value);
                          setShowSuggestions(true);
                          setHighlightedIndex(-1);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onKeyDown={handleServiceAreaKeyDown}
                        placeholder="Type city names or separate with commas..."
                        autoComplete="off"
                      />
                      {/* Autocomplete Dropdown */}
                      {showSuggestions && filteredSuggestions.length > 0 && (
                        <div
                          ref={suggestionsRef}
                          className={`absolute z-10 w-full mt-1 border rounded-lg shadow-lg max-h-48 overflow-y-auto ${
                            mode === 'dark' ? "bg-gray-800 border-white/10" : "bg-white border-gray-200"
                          }`}
                        >
                          {filteredSuggestions.map((suggestion, index) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => selectSuggestion(suggestion)}
                              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                                index === highlightedIndex
                                  ? mode === 'dark' ? "bg-white/10 text-white" : "bg-captain-50 text-captain-700"
                                  : mode === 'dark' ? "text-gray-300 hover:bg-white/5" : "text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              <MapPin size={14} className={mode === 'dark' ? "text-gray-500" : "text-gray-400"} />
                              <span>{suggestion}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <GlassButton
                      type="button"
                      variant="primary"
                      onClick={() => addServiceArea()}
                    >
                      Add
                    </GlassButton>
                  </div>
                  <p className={`text-xs mb-2 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>
                    Tip: You can add multiple areas at once by separating them with commas
                  </p>
                </div>
                {formData.serviceAreas.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.serviceAreas.map((area) => (
                      <span
                        key={area}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                          mode === 'dark' ? "bg-blue-500/20 text-blue-200" : "bg-captain-100 text-captain-700"
                        }`}
                      >
                        <MapPin size={12} className={mode === 'dark' ? "text-blue-400" : "text-captain-500"} />
                        {area}
                        <button
                          type="button"
                          onClick={() => removeServiceArea(area)}
                          className={mode === 'dark' ? "hover:text-white ml-1" : "hover:text-captain-900 ml-1"}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Service Types */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                  <Wrench size={14} className="inline mr-1" />
                  Services Offered <span className="text-red-500">*</span>
                  <span className={`font-normal ml-1 ${mode === 'dark' ? "text-gray-500" : "text-gray-500"}`}>
                    (select all that apply)
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                  {SERVICE_TYPE_OPTIONS.map((type) => (
                    <label
                      key={type}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        formData.serviceTypes.includes(type)
                          ? mode === 'dark' ? "bg-blue-500/20 border-blue-500/50" : "bg-captain-50 border-captain-300"
                          : mode === 'dark' ? "bg-white/5 border-white/10 hover:border-white/20" : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.serviceTypes.includes(type)}
                        onChange={() => toggleServiceType(type)}
                        className="sr-only"
                      />
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          formData.serviceTypes.includes(type)
                            ? mode === 'dark' ? "bg-blue-500 border-blue-500" : "bg-captain-600 border-captain-600"
                            : mode === 'dark' ? "border-white/20" : "border-gray-300"
                        }`}
                      >
                        {formData.serviceTypes.includes(type) && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                      <span className={`text-sm ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Hours of Operation */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className={`text-lg font-semibold mb-1 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
                  Hours of Operation
                </h3>
                <p className={`text-sm mb-4 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                  When are you available for service?
                </p>
              </div>

              <div className="space-y-2">
                {(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const).map(
                  (day) => {
                    const hours = formData.hoursOfOperation[day];
                    return (
                      <div
                        key={day}
                        className={`flex items-center gap-4 py-2 border-b last:border-0 ${mode === 'dark' ? "border-white/10" : "border-gray-100"}`}
                      >
                        <div className="w-24">
                          <span className={`text-sm font-medium capitalize ${mode === 'dark' ? "text-white" : "text-gray-700"}`}>
                            {day}
                          </span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!hours.closed}
                            onChange={(e) => updateHours(day, "closed", !e.target.checked)}
                            className="sr-only"
                          />
                          <div
                            className={`w-10 h-6 rounded-full transition-colors ${
                              !hours.closed 
                                ? mode === 'dark' ? "bg-blue-500" : "bg-captain-600"
                                : mode === 'dark' ? "bg-white/10" : "bg-gray-300"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${
                                !hours.closed ? "translate-x-5" : "translate-x-1"
                              }`}
                            />
                          </div>
                          <span className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                            {hours.closed ? "Closed" : "Open"}
                          </span>
                        </label>
                        {!hours.closed && (
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={hours.open}
                              onChange={(e) => updateHours(day, "open", e.target.value)}
                              className={`px-2 py-1 border rounded text-sm ${
                                mode === 'dark' 
                                  ? "bg-black/20 border-white/10 text-white" 
                                  : "border-gray-300 text-black"
                              }`}
                            />
                            <span className={mode === 'dark' ? "text-gray-500" : "text-gray-400"}>to</span>
                            <input
                              type="time"
                              value={hours.close}
                              onChange={(e) => updateHours(day, "close", e.target.value)}
                              className={`px-2 py-1 border rounded text-sm ${
                                mode === 'dark' 
                                  ? "bg-black/20 border-white/10 text-white" 
                                  : "border-gray-300 text-black"
                              }`}
                            />
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* Step 4: Optional Extras */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className={`text-lg font-semibold mb-1 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
                  Additional Information
                </h3>
                <p className={`text-sm mb-4 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                  These are optional but help build trust with boat owners.
                </p>
              </div>

              {/* Certifications */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                  <Award size={14} className="inline mr-1" />
                  Certifications
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-1 custom-scrollbar">
                  {CERTIFICATION_OPTIONS.map((cert) => (
                    <label
                      key={cert}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        formData.certifications.includes(cert)
                          ? mode === 'dark' ? "bg-green-500/20 border-green-500/50" : "bg-green-50 border-green-300"
                          : mode === 'dark' ? "bg-white/5 border-white/10 hover:border-white/20" : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.certifications.includes(cert)}
                        onChange={() => toggleCertification(cert)}
                        className="sr-only"
                      />
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          formData.certifications.includes(cert)
                            ? mode === 'dark' ? "bg-green-500 border-green-500" : "bg-green-600 border-green-600"
                            : mode === 'dark' ? "border-white/20" : "border-gray-300"
                        }`}
                      >
                        {formData.certifications.includes(cert) && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                      <span className={`text-sm ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>{cert}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Insurance & Bonding */}
              <div className="grid grid-cols-2 gap-4">
                <label
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    formData.isInsured
                      ? mode === 'dark' ? "bg-green-500/20 border-green-500/50" : "bg-green-50 border-green-300"
                      : mode === 'dark' ? "bg-white/5 border-white/10 hover:border-white/20" : "bg-white border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.isInsured}
                    onChange={(e) => updateFormData("isInsured", e.target.checked)}
                    className="sr-only"
                  />
                  <Shield
                    size={24}
                    className={formData.isInsured ? (mode === 'dark' ? "text-green-400" : "text-green-600") : "text-gray-400"}
                  />
                  <div>
                    <div className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Insured</div>
                    <div className={`text-xs ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Liability insurance</div>
                  </div>
                </label>
                <label
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    formData.isBonded
                      ? mode === 'dark' ? "bg-green-500/20 border-green-500/50" : "bg-green-50 border-green-300"
                      : mode === 'dark' ? "bg-white/5 border-white/10 hover:border-white/20" : "bg-white border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.isBonded}
                    onChange={(e) => updateFormData("isBonded", e.target.checked)}
                    className="sr-only"
                  />
                  <Shield
                    size={24}
                    className={formData.isBonded ? (mode === 'dark' ? "text-green-400" : "text-green-600") : "text-gray-400"}
                  />
                  <div>
                    <div className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Bonded</div>
                    <div className={`text-xs ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Surety bonded</div>
                  </div>
                </label>
              </div>

              {/* Mobile Capabilities */}
              <label
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  formData.hasMobileCapabilities
                    ? mode === 'dark' ? "bg-blue-500/20 border-blue-500/50" : "bg-captain-50 border-captain-300"
                    : mode === 'dark' ? "bg-white/5 border-white/10 hover:border-white/20" : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.hasMobileCapabilities}
                  onChange={(e) => updateFormData("hasMobileCapabilities", e.target.checked)}
                  className="sr-only"
                />
                <Truck
                  size={24}
                  className={formData.hasMobileCapabilities ? (mode === 'dark' ? "text-blue-400" : "text-captain-600") : "text-gray-400"}
                />
                <div>
                  <div className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Mobile Service</div>
                  <div className={`text-xs ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                    I can travel to the boat's location
                  </div>
                </div>
              </label>

              {/* Web Links */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <GlassInput
                    label={
                      <>
                        <Globe size={14} className="inline mr-1" />
                        Website
                      </>
                    }
                    type="url"
                    value={formData.websiteUrl}
                    onChange={(e) => updateFormData("websiteUrl", e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <GlassInput
                    label="Google Business"
                    type="url"
                    value={formData.googleMyBusinessUrl}
                    onChange={(e) => updateFormData("googleMyBusinessUrl", e.target.value)}
                    placeholder="Google My Business URL"
                  />
                </div>
              </div>

              {/* Languages */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                  <Languages size={14} className="inline mr-1" />
                  Languages Spoken
                </label>
                <div className="flex gap-2 mb-2">
                  <GlassInput
                    value={formData.languageInput}
                    onChange={(e) => updateFormData("languageInput", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLanguage())}
                    placeholder="Add a language"
                    className="flex-1"
                  />
                  <GlassButton
                    type="button"
                    variant="secondary"
                    onClick={addLanguage}
                  >
                    Add
                  </GlassButton>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.languagesSpoken.map((lang) => (
                    <span
                      key={lang}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                        mode === 'dark' ? "bg-white/10 text-white" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {lang}
                      <button
                        type="button"
                        onClick={() => removeLanguage(lang)}
                        className={mode === 'dark' ? "hover:text-white" : "hover:text-gray-900"}
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                  About Your Business
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => updateFormData("bio", e.target.value)}
                  rows={3}
                  className={`w-full rounded-xl px-4 py-3 border transition-all resize-none focus:outline-none focus:ring-1 ${
                    mode === 'dark'
                      ? "bg-black/20 border-white/10 text-white placeholder-gray-400 focus:border-blue-500/50 focus:ring-blue-500/50"
                      : "bg-white/50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:bg-white"
                  }`}
                  placeholder="Tell boat owners a bit about your experience and expertise..."
                />
              </div>
            </div>
          )}

          {error && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${mode === 'dark' ? "bg-red-500/10 border border-red-500/20 text-red-400" : "bg-red-50 text-red-700"}`}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 flex justify-between flex-shrink-0 border-t ${mode === 'dark' ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"}`}>
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

          {currentStep < 4 ? (
            <GlassButton
              variant="primary"
              onClick={() => setCurrentStep((prev) => (prev + 1) as Step)}
              disabled={!canProceed() || isSubmitting}
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
                  Saving...
                </>
              ) : (
                <>
                  Complete Setup
                  <Check size={18} />
                </>
              )}
            </GlassButton>
          )}
        </div>
    </GlassModal>
  );
}

export default MechanicOnboarding;
