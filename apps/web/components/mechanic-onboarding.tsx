"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8">
      <div className="w-full max-w-2xl mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-captain-600 to-captain-700 px-6 py-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">Welcome to QR Captain!</h2>
              <p className="text-captain-100 text-sm">
                Let's set up your mechanic profile, {userName.split(" ")[0]}
              </p>
            </div>
            <button
              onClick={handleSkip}
              disabled={isSubmitting}
              className="text-sm text-captain-200 hover:text-white transition-colors"
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
                          ? "bg-white text-captain-600"
                          : isActive
                          ? "bg-white/20 text-white ring-2 ring-white"
                          : "bg-white/10 text-white/60"
                      }`}
                    >
                      {isCompleted ? <Check size={20} /> : <StepIcon size={20} />}
                    </div>
                    <span
                      className={`text-xs mt-1 ${
                        isActive ? "text-white" : "text-captain-200"
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-12 h-0.5 mx-2 ${
                        isCompleted ? "bg-white" : "bg-white/20"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Step 1: Business Information */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Business Information
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Tell us about {companyName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Years in Business <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.businessYearsInOperation}
                    onChange={(e) => updateFormData("businessYearsInOperation", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    placeholder="5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business License # <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.businessLicenseNumber}
                    onChange={(e) => updateFormData("businessLicenseNumber", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    placeholder="BL-123456"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin size={14} className="inline mr-1" />
                  Business Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.street}
                  onChange={(e) => updateFormData("street", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20 mb-2"
                  placeholder="Street Address"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => updateFormData("city", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    placeholder="City"
                  />
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => updateFormData("state", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    placeholder="State"
                  />
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => updateFormData("zipCode", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
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
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Services & Coverage
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  What areas do you serve and what services do you offer?
                </p>
              </div>

              {/* Service Areas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin size={14} className="inline mr-1" />
                  Service Areas <span className="text-red-500">*</span>
                  <span className="font-normal text-gray-500 ml-1">
                    (cities, regions, or marinas you serve)
                  </span>
                </label>
                <div className="relative">
                  <div className="flex gap-2 mb-2">
                    <div className="relative flex-1">
                      <input
                        ref={serviceAreaInputRef}
                        type="text"
                        value={formData.serviceAreaInput}
                        onChange={(e) => {
                          updateFormData("serviceAreaInput", e.target.value);
                          setShowSuggestions(true);
                          setHighlightedIndex(-1);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onKeyDown={handleServiceAreaKeyDown}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                        placeholder="Type city names or separate with commas..."
                        autoComplete="off"
                      />
                      {/* Autocomplete Dropdown */}
                      {showSuggestions && filteredSuggestions.length > 0 && (
                        <div
                          ref={suggestionsRef}
                          className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                        >
                          {filteredSuggestions.map((suggestion, index) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => selectSuggestion(suggestion)}
                              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                                index === highlightedIndex
                                  ? "bg-captain-50 text-captain-700"
                                  : "text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                              <span>{suggestion}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => addServiceArea()}
                      className="px-4 py-2.5 bg-captain-600 text-white rounded-lg hover:bg-captain-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    Tip: You can add multiple areas at once by separating them with commas
                  </p>
                </div>
                {formData.serviceAreas.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.serviceAreas.map((area) => (
                      <span
                        key={area}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-captain-100 text-captain-700 rounded-full text-sm"
                      >
                        <MapPin size={12} className="text-captain-500" />
                        {area}
                        <button
                          type="button"
                          onClick={() => removeServiceArea(area)}
                          className="hover:text-captain-900 ml-1"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Wrench size={14} className="inline mr-1" />
                  Services Offered <span className="text-red-500">*</span>
                  <span className="font-normal text-gray-500 ml-1">
                    (select all that apply)
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {SERVICE_TYPE_OPTIONS.map((type) => (
                    <label
                      key={type}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        formData.serviceTypes.includes(type)
                          ? "bg-captain-50 border-captain-300"
                          : "bg-white border-gray-200 hover:border-gray-300"
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
                            ? "bg-captain-600 border-captain-600"
                            : "border-gray-300"
                        }`}
                      >
                        {formData.serviceTypes.includes(type) && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                      <span className="text-sm text-gray-700">{type}</span>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Hours of Operation
                </h3>
                <p className="text-sm text-gray-500 mb-4">
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
                        className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0"
                      >
                        <div className="w-24">
                          <span className="text-sm font-medium text-gray-700 capitalize">
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
                              !hours.closed ? "bg-captain-600" : "bg-gray-300"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${
                                !hours.closed ? "translate-x-5" : "translate-x-1"
                              }`}
                            />
                          </div>
                          <span className="text-sm text-gray-500">
                            {hours.closed ? "Closed" : "Open"}
                          </span>
                        </label>
                        {!hours.closed && (
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={hours.open}
                              onChange={(e) => updateHours(day, "open", e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm text-black"
                            />
                            <span className="text-gray-400">to</span>
                            <input
                              type="time"
                              value={hours.close}
                              onChange={(e) => updateHours(day, "close", e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm text-black"
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
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Additional Information
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  These are optional but help build trust with boat owners.
                </p>
              </div>

              {/* Certifications */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Award size={14} className="inline mr-1" />
                  Certifications
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-1">
                  {CERTIFICATION_OPTIONS.map((cert) => (
                    <label
                      key={cert}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        formData.certifications.includes(cert)
                          ? "bg-green-50 border-green-300"
                          : "bg-white border-gray-200 hover:border-gray-300"
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
                            ? "bg-green-600 border-green-600"
                            : "border-gray-300"
                        }`}
                      >
                        {formData.certifications.includes(cert) && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                      <span className="text-sm text-gray-700">{cert}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Insurance & Bonding */}
              <div className="grid grid-cols-2 gap-4">
                <label
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    formData.isInsured
                      ? "bg-green-50 border-green-300"
                      : "bg-white border-gray-200 hover:border-gray-300"
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
                    className={formData.isInsured ? "text-green-600" : "text-gray-400"}
                  />
                  <div>
                    <div className="font-medium text-gray-900">Insured</div>
                    <div className="text-xs text-gray-500">Liability insurance</div>
                  </div>
                </label>
                <label
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    formData.isBonded
                      ? "bg-green-50 border-green-300"
                      : "bg-white border-gray-200 hover:border-gray-300"
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
                    className={formData.isBonded ? "text-green-600" : "text-gray-400"}
                  />
                  <div>
                    <div className="font-medium text-gray-900">Bonded</div>
                    <div className="text-xs text-gray-500">Surety bonded</div>
                  </div>
                </label>
              </div>

              {/* Mobile Capabilities */}
              <label
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  formData.hasMobileCapabilities
                    ? "bg-captain-50 border-captain-300"
                    : "bg-white border-gray-200 hover:border-gray-300"
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
                  className={formData.hasMobileCapabilities ? "text-captain-600" : "text-gray-400"}
                />
                <div>
                  <div className="font-medium text-gray-900">Mobile Service</div>
                  <div className="text-xs text-gray-500">
                    I can travel to the boat's location
                  </div>
                </div>
              </label>

              {/* Web Links */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Globe size={14} className="inline mr-1" />
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.websiteUrl}
                    onChange={(e) => updateFormData("websiteUrl", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Google Business
                  </label>
                  <input
                    type="url"
                    value={formData.googleMyBusinessUrl}
                    onChange={(e) => updateFormData("googleMyBusinessUrl", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    placeholder="Google My Business URL"
                  />
                </div>
              </div>

              {/* Languages */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Languages size={14} className="inline mr-1" />
                  Languages Spoken
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={formData.languageInput}
                    onChange={(e) => updateFormData("languageInput", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLanguage())}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    placeholder="Add a language"
                  />
                  <button
                    type="button"
                    onClick={addLanguage}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.languagesSpoken.map((lang) => (
                    <span
                      key={lang}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {lang}
                      <button
                        type="button"
                        onClick={() => removeLanguage(lang)}
                        className="hover:text-gray-900"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  About Your Business
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => updateFormData("bio", e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20 resize-none"
                  placeholder="Tell boat owners a bit about your experience and expertise..."
                />
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
        <div className="border-t border-gray-200 px-6 py-4 flex justify-between">
          {currentStep > 1 ? (
            <button
              onClick={() => setCurrentStep((prev) => (prev - 1) as Step)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ChevronLeft size={18} />
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <button
              onClick={() => setCurrentStep((prev) => (prev + 1) as Step)}
              disabled={!canProceed() || isSubmitting}
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
                  Saving...
                </>
              ) : (
                <>
                  Complete Setup
                  <Check size={18} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default MechanicOnboarding;
