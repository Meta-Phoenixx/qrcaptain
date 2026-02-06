"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ImageCropper } from "./image-cropper";
import { GlassCard, GlassButton, GlassBadge, GlassInput, GlassSelect, GlassModal } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";
import {
  Building2,
  MapPin,
  Clock,
  Award,
  Check,
  X,
  Wrench,
  Globe,
  Shield,
  Truck,
  Languages,
  Phone,
  Mail,
  Edit3,
  Save,
  Camera,
  User,
  Calendar,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ImageIcon,
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

// Reuse the same options from onboarding
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

type EditSection = 
  | "basic"
  | "business"
  | "services"
  | "hours"
  | "credentials"
  | "about"
  | null;

interface MechanicProfileProps {
  onClose?: () => void;
}

export function MechanicProfile({ onClose }: MechanicProfileProps = {}) {
  const { mode } = useTheme();
  const user = useQuery(api.users.currentUser);
  const onboardingStatus = useQuery(api.users.getMechanicOnboardingStatus);
  const profilePhotoUrl = useQuery(api.storage.getMechanicProfilePhotoUrl, {});
  const companyLogoUrl = useQuery(api.storage.getMechanicCompanyLogoUrl, {});
  const updateProfile = useMutation(api.users.updateMechanicProfile);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const saveProfilePhoto = useMutation(api.storage.saveMechanicProfilePhoto);
  const saveCompanyLogo = useMutation(api.storage.saveMechanicCompanyLogo);

  const [editSection, setEditSection] = useState<EditSection>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["basic", "business", "services"]));

  // Photo upload state
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const companyLogoInputRef = useRef<HTMLInputElement>(null);
  const [imageToCrop, setImageToCrop] = useState<{ url: string; type: "profile" | "logo" } | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Service area autocomplete state
  const [showServiceAreaSuggestions, setShowServiceAreaSuggestions] = useState(false);
  const [serviceAreaHighlightedIndex, setServiceAreaHighlightedIndex] = useState(-1);
  const serviceAreaInputRef = useRef<HTMLInputElement>(null);
  const serviceAreaSuggestionsRef = useRef<HTMLDivElement>(null);

  // Form state for editing
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    phone: "",
    businessYearsInOperation: "",
    businessLicenseNumber: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    serviceAreas: [] as string[],
    serviceAreaInput: "",
    serviceTypes: [] as string[],
    hoursOfOperation: {
      monday: { open: "08:00", close: "17:00", closed: false },
      tuesday: { open: "08:00", close: "17:00", closed: false },
      wednesday: { open: "08:00", close: "17:00", closed: false },
      thursday: { open: "08:00", close: "17:00", closed: false },
      friday: { open: "08:00", close: "17:00", closed: false },
      saturday: { open: "09:00", close: "14:00", closed: false },
      sunday: { open: "09:00", close: "14:00", closed: true },
    },
    certifications: [] as string[],
    specializations: [] as string[],
    googleMyBusinessUrl: "",
    websiteUrl: "",
    isInsured: false,
    isBonded: false,
    hasMobileCapabilities: true,
    languagesSpoken: [] as string[],
    languageInput: "",
    bio: "",
  });

  // Populate form when user data loads
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        companyName: user.companyName || "",
        phone: user.phone || "",
        businessYearsInOperation: user.businessYearsInOperation?.toString() || "",
        businessLicenseNumber: user.businessLicenseNumber || "",
        street: user.businessAddress?.street || "",
        city: user.businessAddress?.city || "",
        state: user.businessAddress?.state || "",
        zipCode: user.businessAddress?.zipCode || "",
        serviceAreas: user.serviceAreas || [],
        serviceAreaInput: "",
        serviceTypes: user.serviceTypes || [],
        hoursOfOperation: user.hoursOfOperation ? {
          monday: { open: user.hoursOfOperation.monday?.open || "08:00", close: user.hoursOfOperation.monday?.close || "17:00", closed: user.hoursOfOperation.monday?.closed ?? false },
          tuesday: { open: user.hoursOfOperation.tuesday?.open || "08:00", close: user.hoursOfOperation.tuesday?.close || "17:00", closed: user.hoursOfOperation.tuesday?.closed ?? false },
          wednesday: { open: user.hoursOfOperation.wednesday?.open || "08:00", close: user.hoursOfOperation.wednesday?.close || "17:00", closed: user.hoursOfOperation.wednesday?.closed ?? false },
          thursday: { open: user.hoursOfOperation.thursday?.open || "08:00", close: user.hoursOfOperation.thursday?.close || "17:00", closed: user.hoursOfOperation.thursday?.closed ?? false },
          friday: { open: user.hoursOfOperation.friday?.open || "08:00", close: user.hoursOfOperation.friday?.close || "17:00", closed: user.hoursOfOperation.friday?.closed ?? false },
          saturday: { open: user.hoursOfOperation.saturday?.open || "09:00", close: user.hoursOfOperation.saturday?.close || "14:00", closed: user.hoursOfOperation.saturday?.closed ?? false },
          sunday: { open: user.hoursOfOperation.sunday?.open || "09:00", close: user.hoursOfOperation.sunday?.close || "14:00", closed: user.hoursOfOperation.sunday?.closed ?? true },
        } : {
          monday: { open: "08:00", close: "17:00", closed: false },
          tuesday: { open: "08:00", close: "17:00", closed: false },
          wednesday: { open: "08:00", close: "17:00", closed: false },
          thursday: { open: "08:00", close: "17:00", closed: false },
          friday: { open: "08:00", close: "17:00", closed: false },
          saturday: { open: "09:00", close: "14:00", closed: false },
          sunday: { open: "09:00", close: "14:00", closed: true },
        },
        certifications: user.certifications || [],
        specializations: user.specializations || [],
        googleMyBusinessUrl: user.googleMyBusinessUrl || "",
        websiteUrl: user.websiteUrl || "",
        isInsured: user.isInsured || false,
        isBonded: user.isBonded || false,
        hasMobileCapabilities: user.hasMobileCapabilities !== false,
        languagesSpoken: user.languagesSpoken || ["English"],
        languageInput: "",
        bio: user.bio || "",
      });
    }
  }, [user]);

  // Filter service area suggestions based on input
  const filteredServiceAreaSuggestions = formData.serviceAreaInput.trim()
    ? SERVICE_AREA_SUGGESTIONS.filter(
        (area) =>
          area.toLowerCase().includes(formData.serviceAreaInput.toLowerCase()) &&
          !formData.serviceAreas.some(
            (existing) => existing.toLowerCase() === area.toLowerCase()
          )
      ).slice(0, 8)
    : [];

  // Close service area suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        serviceAreaSuggestionsRef.current &&
        !serviceAreaSuggestionsRef.current.contains(e.target as Node) &&
        serviceAreaInputRef.current &&
        !serviceAreaInputRef.current.contains(e.target as Node)
      ) {
        setShowServiceAreaSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle photo file selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "profile" | "logo") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    setImageToCrop({ url: imageUrl, type });
  };

  // Handle cropped image upload
  const handleCroppedImage = async (croppedBlob: Blob) => {
    if (!imageToCrop) return;
    
    setIsUploadingPhoto(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: croppedBlob,
      });
      const { storageId } = await result.json();
      
      if (imageToCrop.type === "profile") {
        await saveProfilePhoto({ storageId });
      } else {
        await saveCompanyLogo({ storageId });
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsUploadingPhoto(false);
      if (imageToCrop.url) {
        URL.revokeObjectURL(imageToCrop.url);
      }
      setImageToCrop(null);
      if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = "";
      if (companyLogoInputRef.current) companyLogoInputRef.current.value = "";
    }
  };

  // Cancel cropping
  const handleCropCancel = () => {
    if (imageToCrop?.url) {
      URL.revokeObjectURL(imageToCrop.url);
    }
    setImageToCrop(null);
    if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = "";
    if (companyLogoInputRef.current) companyLogoInputRef.current.value = "";
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-captain-200 border-t-captain-600"></div>
      </div>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

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
    setShowServiceAreaSuggestions(false);
    setServiceAreaHighlightedIndex(-1);
  };
  
  const selectServiceAreaSuggestion = (suggestion: string) => {
    addServiceArea(suggestion);
    serviceAreaInputRef.current?.focus();
  };
  
  const handleServiceAreaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (serviceAreaHighlightedIndex >= 0 && filteredServiceAreaSuggestions[serviceAreaHighlightedIndex]) {
        selectServiceAreaSuggestion(filteredServiceAreaSuggestions[serviceAreaHighlightedIndex]);
      } else {
        addServiceArea();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setServiceAreaHighlightedIndex((prev) =>
        prev < filteredServiceAreaSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setServiceAreaHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Escape") {
      setShowServiceAreaSuggestions(false);
      setServiceAreaHighlightedIndex(-1);
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

  const handleSave = async (section: EditSection) => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const updates: Record<string, unknown> = {};

      switch (section) {
        case "basic":
          updates.firstName = formData.firstName;
          updates.lastName = formData.lastName;
          updates.companyName = formData.companyName;
          updates.phone = formData.phone;
          break;
        case "business":
          updates.businessYearsInOperation = parseInt(formData.businessYearsInOperation) || undefined;
          updates.businessLicenseNumber = formData.businessLicenseNumber || undefined;
          if (formData.street && formData.city && formData.state && formData.zipCode) {
            updates.businessAddress = {
              street: formData.street,
              city: formData.city,
              state: formData.state,
              zipCode: formData.zipCode,
            };
          }
          break;
        case "services":
          updates.serviceAreas = formData.serviceAreas;
          updates.serviceTypes = formData.serviceTypes;
          break;
        case "hours":
          updates.hoursOfOperation = formData.hoursOfOperation;
          break;
        case "credentials":
          updates.certifications = formData.certifications;
          updates.specializations = formData.specializations;
          updates.isInsured = formData.isInsured;
          updates.isBonded = formData.isBonded;
          updates.hasMobileCapabilities = formData.hasMobileCapabilities;
          break;
        case "about":
          updates.bio = formData.bio || undefined;
          updates.websiteUrl = formData.websiteUrl || undefined;
          updates.googleMyBusinessUrl = formData.googleMyBusinessUrl || undefined;
          updates.languagesSpoken = formData.languagesSpoken;
          break;
      }

      await updateProfile(updates as any);
      setSaveSuccess(true);
      setEditSection(null);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    // Reset form to current user data
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        companyName: user.companyName || "",
        phone: user.phone || "",
        businessYearsInOperation: user.businessYearsInOperation?.toString() || "",
        businessLicenseNumber: user.businessLicenseNumber || "",
        street: user.businessAddress?.street || "",
        city: user.businessAddress?.city || "",
        state: user.businessAddress?.state || "",
        zipCode: user.businessAddress?.zipCode || "",
        serviceAreas: user.serviceAreas || [],
        serviceAreaInput: "",
        serviceTypes: user.serviceTypes || [],
        hoursOfOperation: user.hoursOfOperation ? {
          monday: { open: user.hoursOfOperation.monday?.open || "08:00", close: user.hoursOfOperation.monday?.close || "17:00", closed: user.hoursOfOperation.monday?.closed ?? false },
          tuesday: { open: user.hoursOfOperation.tuesday?.open || "08:00", close: user.hoursOfOperation.tuesday?.close || "17:00", closed: user.hoursOfOperation.tuesday?.closed ?? false },
          wednesday: { open: user.hoursOfOperation.wednesday?.open || "08:00", close: user.hoursOfOperation.wednesday?.close || "17:00", closed: user.hoursOfOperation.wednesday?.closed ?? false },
          thursday: { open: user.hoursOfOperation.thursday?.open || "08:00", close: user.hoursOfOperation.thursday?.close || "17:00", closed: user.hoursOfOperation.thursday?.closed ?? false },
          friday: { open: user.hoursOfOperation.friday?.open || "08:00", close: user.hoursOfOperation.friday?.close || "17:00", closed: user.hoursOfOperation.friday?.closed ?? false },
          saturday: { open: user.hoursOfOperation.saturday?.open || "09:00", close: user.hoursOfOperation.saturday?.close || "14:00", closed: user.hoursOfOperation.saturday?.closed ?? false },
          sunday: { open: user.hoursOfOperation.sunday?.open || "09:00", close: user.hoursOfOperation.sunday?.close || "14:00", closed: user.hoursOfOperation.sunday?.closed ?? true },
        } : formData.hoursOfOperation,
        certifications: user.certifications || [],
        specializations: user.specializations || [],
        googleMyBusinessUrl: user.googleMyBusinessUrl || "",
        websiteUrl: user.websiteUrl || "",
        isInsured: user.isInsured || false,
        isBonded: user.isBonded || false,
        hasMobileCapabilities: user.hasMobileCapabilities !== false,
        languagesSpoken: user.languagesSpoken || ["English"],
        languageInput: "",
        bio: user.bio || "",
      });
    }
    setEditSection(null);
    setError(null);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  // Section Header Component
  const SectionHeader = ({ 
    title, 
    icon: Icon, 
    section, 
    isEditing,
    canEdit = true 
  }: { 
    title: string; 
    icon: React.ElementType; 
    section: string;
    isEditing: boolean;
    canEdit?: boolean;
  }) => (
    <div 
      className="flex items-center justify-between cursor-pointer"
      onClick={() => toggleSection(section)}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-captain-100 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-captain-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="flex items-center gap-2">
        {canEdit && !isEditing && expandedSections.has(section) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditSection(section as EditSection);
            }}
            className="p-2 text-gray-500 hover:text-captain-600 hover:bg-captain-50 rounded-lg transition-colors"
          >
            <Edit3 size={18} />
          </button>
        )}
        {expandedSections.has(section) ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </div>
    </div>
  );

  // Info Field Component
  const InfoField = ({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) => (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="w-4 h-4 text-gray-400 mt-0.5" />}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-900">{value || <span className="text-gray-400 italic">Not provided</span>}</p>
      </div>
    </div>
  );

  const profileContent = (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-captain-600 to-captain-700 rounded-2xl p-6 text-white">
        <div className="flex items-start gap-6">
          {/* Profile Photo */}
          <div className="relative">
            {profilePhotoUrl ? (
              <img 
                src={profilePhotoUrl} 
                alt="Profile" 
                className="w-24 h-24 rounded-xl object-cover"
              />
            ) : (
              <div className="w-24 h-24 bg-white/20 rounded-xl flex items-center justify-center">
                <User className="w-12 h-12 text-white/60" />
              </div>
            )}
            <button 
              onClick={() => profilePhotoInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {isUploadingPhoto ? (
                <div className="w-4 h-4 border-2 border-captain-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-captain-600" />
              )}
            </button>
            <input
              ref={profilePhotoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoSelect(e, "profile")}
              className="hidden"
            />
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-bold">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name}</h2>
            <p className="text-captain-100">{user.companyName}</p>
            <div className="flex items-center gap-4 mt-3">
              {user.email && (
                <span className="flex items-center gap-1.5 text-sm text-captain-100">
                  <Mail size={14} />
                  {user.email}
                </span>
              )}
              {user.phone && (
                <span className="flex items-center gap-1.5 text-sm text-captain-100">
                  <Phone size={14} />
                  {user.phone}
                </span>
              )}
            </div>
          </div>

          {/* Company Logo */}
          <div className="relative">
            <div className="text-xs text-captain-200 mb-1 text-center">Company Logo</div>
            {companyLogoUrl ? (
              <img 
                src={companyLogoUrl} 
                alt="Company Logo" 
                className="w-20 h-20 rounded-lg object-contain bg-white p-1"
              />
            ) : (
              <div className="w-20 h-20 bg-white/20 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-white/60" />
              </div>
            )}
            <button 
              onClick={() => companyLogoInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="absolute -bottom-2 -right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {isUploadingPhoto ? (
                <div className="w-3 h-3 border-2 border-captain-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-3 h-3 text-captain-600" />
              )}
            </button>
            <input
              ref={companyLogoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoSelect(e, "logo")}
              className="hidden"
            />
          </div>

          {/* Profile Completion Status */}
          {onboardingStatus && (
            <div className="text-right">
              <div className="text-sm text-captain-100 mb-1">Profile Completion</div>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${onboardingStatus.progressPercent}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{onboardingStatus.progressPercent}%</span>
              </div>
              {onboardingStatus.isCompleted && (
                <div className="flex items-center gap-1 text-sm text-green-300 mt-1">
                  <Check size={14} />
                  Verified
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Image Cropper Modal */}
      {imageToCrop && (
        <ImageCropper
          imageSrc={imageToCrop.url}
          onCropComplete={handleCroppedImage}
          onCancel={handleCropCancel}
          aspectRatio={1}
        />
      )}

      {/* Success/Error Messages */}
      {saveSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600" />
          <span className="text-green-700">Profile updated successfully!</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Basic Information */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <SectionHeader 
            title="Basic Information" 
            icon={User} 
            section="basic"
            isEditing={editSection === "basic"}
          />
        </div>
        
        {expandedSections.has("basic") && (
          <div className="p-4">
            {editSection === "basic" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => updateFormData("firstName", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => updateFormData("lastName", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => updateFormData("companyName", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateFormData("phone", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSave("basic")}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-captain-600 text-white rounded-lg hover:bg-captain-700 disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? "Saving..." : <><Save size={16} /> Save</>}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                <InfoField label="First Name" value={user.firstName} icon={User} />
                <InfoField label="Last Name" value={user.lastName} icon={User} />
                <InfoField label="Business Name" value={user.companyName} icon={Building2} />
                <InfoField label="Phone" value={user.phone} icon={Phone} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Business Details */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <SectionHeader 
            title="Business Details" 
            icon={Building2} 
            section="business"
            isEditing={editSection === "business"}
          />
        </div>
        
        {expandedSections.has("business") && (
          <div className="p-4">
            {editSection === "business" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Years in Business</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.businessYearsInOperation}
                      onChange={(e) => updateFormData("businessYearsInOperation", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business License #</label>
                    <input
                      type="text"
                      value={formData.businessLicenseNumber}
                      onChange={(e) => updateFormData("businessLicenseNumber", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
                  <input
                    type="text"
                    placeholder="Street"
                    value={formData.street}
                    onChange={(e) => updateFormData("street", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20 mb-2"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="City"
                      value={formData.city}
                      onChange={(e) => updateFormData("city", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={formData.state}
                      onChange={(e) => updateFormData("state", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    />
                    <input
                      type="text"
                      placeholder="ZIP"
                      value={formData.zipCode}
                      onChange={(e) => updateFormData("zipCode", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={cancelEdit} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                  <button onClick={() => handleSave("business")} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-captain-600 text-white rounded-lg hover:bg-captain-700 disabled:opacity-50 transition-colors">
                    {isSaving ? "Saving..." : <><Save size={16} /> Save</>}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="Years in Business" value={user.businessYearsInOperation ? `${user.businessYearsInOperation} years` : undefined} icon={Calendar} />
                  <InfoField label="License Number" value={user.businessLicenseNumber} icon={FileText} />
                </div>
                <InfoField 
                  label="Business Address" 
                  value={user.businessAddress ? 
                    `${user.businessAddress.street}, ${user.businessAddress.city}, ${user.businessAddress.state} ${user.businessAddress.zipCode}` 
                    : undefined
                  } 
                  icon={MapPin} 
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Services & Coverage */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <SectionHeader 
            title="Services & Coverage" 
            icon={Wrench} 
            section="services"
            isEditing={editSection === "services"}
          />
        </div>
        
        {expandedSections.has("services") && (
          <div className="p-4">
            {editSection === "services" ? (
              <div className="space-y-4">
                {/* Service Areas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service Areas</label>
                  <div className="relative">
                    <div className="flex gap-2 mb-2">
                      <div className="relative flex-1">
                        <input
                          ref={serviceAreaInputRef}
                          type="text"
                          value={formData.serviceAreaInput}
                          onChange={(e) => {
                            updateFormData("serviceAreaInput", e.target.value);
                            setShowServiceAreaSuggestions(true);
                            setServiceAreaHighlightedIndex(-1);
                          }}
                          onFocus={() => setShowServiceAreaSuggestions(true)}
                          onKeyDown={handleServiceAreaKeyDown}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                          placeholder="Type city names or separate with commas..."
                          autoComplete="off"
                        />
                        {/* Autocomplete Dropdown */}
                        {showServiceAreaSuggestions && filteredServiceAreaSuggestions.length > 0 && (
                          <div
                            ref={serviceAreaSuggestionsRef}
                            className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                          >
                            {filteredServiceAreaSuggestions.map((suggestion, index) => (
                              <button
                                key={suggestion}
                                type="button"
                                onClick={() => selectServiceAreaSuggestion(suggestion)}
                                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                                  index === serviceAreaHighlightedIndex
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
                      <button type="button" onClick={() => addServiceArea()} className="px-4 py-2.5 bg-captain-600 text-white rounded-lg hover:bg-captain-700 transition-colors">Add</button>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">
                      Tip: You can add multiple areas at once by separating them with commas
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.serviceAreas.map((area) => (
                      <span key={area} className="inline-flex items-center gap-1 px-3 py-1 bg-captain-100 text-captain-700 rounded-full text-sm">
                        <MapPin size={12} className="text-captain-500" />
                        {area}
                        <button type="button" onClick={() => removeServiceArea(area)} className="hover:text-captain-900 ml-1"><X size={14} /></button>
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Service Types */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Services Offered</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                    {SERVICE_TYPE_OPTIONS.map((type) => (
                      <label key={type} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${formData.serviceTypes.includes(type) ? "bg-captain-50 border-captain-300" : "bg-white border-gray-200 hover:border-gray-300"}`}>
                        <input type="checkbox" checked={formData.serviceTypes.includes(type)} onChange={() => toggleServiceType(type)} className="sr-only" />
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${formData.serviceTypes.includes(type) ? "bg-captain-600 border-captain-600" : "border-gray-300"}`}>
                          {formData.serviceTypes.includes(type) && <Check size={12} className="text-white" />}
                        </div>
                        <span className="text-sm text-gray-700">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <button onClick={cancelEdit} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                  <button onClick={() => handleSave("services")} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-captain-600 text-white rounded-lg hover:bg-captain-700 disabled:opacity-50 transition-colors">
                    {isSaving ? "Saving..." : <><Save size={16} /> Save</>}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-2">Service Areas</p>
                  {user.serviceAreas && user.serviceAreas.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {user.serviceAreas.map((area) => (
                        <span key={area} className="inline-flex items-center gap-1 px-3 py-1 bg-captain-100 text-captain-700 rounded-full text-sm">
                          <MapPin size={12} className="text-captain-500" />
                          {area}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No service areas specified</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">Services Offered</p>
                  {user.serviceTypes && user.serviceTypes.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {user.serviceTypes.map((type) => (
                        <span key={type} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">{type}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No services specified</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hours of Operation */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <SectionHeader 
            title="Hours of Operation" 
            icon={Clock} 
            section="hours"
            isEditing={editSection === "hours"}
          />
        </div>
        
        {expandedSections.has("hours") && (
          <div className="p-4">
            {editSection === "hours" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  {(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const).map((day) => {
                    const hours = formData.hoursOfOperation[day];
                    return (
                      <div key={day} className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0">
                        <div className="w-24">
                          <span className="text-sm font-medium text-gray-700 capitalize">{day}</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={!hours.closed} onChange={(e) => updateHours(day, "closed", !e.target.checked)} className="sr-only" />
                          <div className={`w-10 h-6 rounded-full transition-colors ${!hours.closed ? "bg-captain-600" : "bg-gray-300"}`}>
                            <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${!hours.closed ? "translate-x-5" : "translate-x-1"}`} />
                          </div>
                          <span className="text-sm text-gray-500">{hours.closed ? "Closed" : "Open"}</span>
                        </label>
                        {!hours.closed && (
                          <div className="flex items-center gap-2">
                            <input type="time" value={hours.open} onChange={(e) => updateHours(day, "open", e.target.value)} className="px-2 py-1 border border-gray-300 rounded text-sm text-black" />
                            <span className="text-gray-400">to</span>
                            <input type="time" value={hours.close} onChange={(e) => updateHours(day, "close", e.target.value)} className="px-2 py-1 border border-gray-300 rounded text-sm text-black" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={cancelEdit} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                  <button onClick={() => handleSave("hours")} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-captain-600 text-white rounded-lg hover:bg-captain-700 disabled:opacity-50 transition-colors">
                    {isSaving ? "Saving..." : <><Save size={16} /> Save</>}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {user.hoursOfOperation ? (
                  (["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const).map((day) => {
                    const hours = user.hoursOfOperation?.[day];
                    return (
                      <div key={day} className="flex items-center gap-4 py-1.5">
                        <span className="w-24 text-sm text-gray-600 capitalize">{day}</span>
                        {hours?.closed ? (
                          <span className="text-sm text-gray-400">Closed</span>
                        ) : hours ? (
                          <span className="text-sm text-gray-900">{formatTime(hours.open)} - {formatTime(hours.close)}</span>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Not set</span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-400 italic">Hours not specified</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Credentials & Capabilities */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <SectionHeader 
            title="Credentials & Capabilities" 
            icon={Award} 
            section="credentials"
            isEditing={editSection === "credentials"}
          />
        </div>
        
        {expandedSections.has("credentials") && (
          <div className="p-4">
            {editSection === "credentials" ? (
              <div className="space-y-4">
                {/* Certifications */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Certifications</label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {CERTIFICATION_OPTIONS.map((cert) => (
                      <label key={cert} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${formData.certifications.includes(cert) ? "bg-green-50 border-green-300" : "bg-white border-gray-200 hover:border-gray-300"}`}>
                        <input type="checkbox" checked={formData.certifications.includes(cert)} onChange={() => toggleCertification(cert)} className="sr-only" />
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${formData.certifications.includes(cert) ? "bg-green-600 border-green-600" : "border-gray-300"}`}>
                          {formData.certifications.includes(cert) && <Check size={12} className="text-white" />}
                        </div>
                        <span className="text-sm text-gray-700">{cert}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Specializations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Specializations</label>
                  <div className="grid grid-cols-3 gap-2">
                    {SPECIALIZATION_OPTIONS.map((spec) => (
                      <label key={spec} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${formData.specializations.includes(spec) ? "bg-captain-50 border-captain-300" : "bg-white border-gray-200 hover:border-gray-300"}`}>
                        <input type="checkbox" checked={formData.specializations.includes(spec)} onChange={() => toggleSpecialization(spec)} className="sr-only" />
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${formData.specializations.includes(spec) ? "bg-captain-600 border-captain-600" : "border-gray-300"}`}>
                          {formData.specializations.includes(spec) && <Check size={12} className="text-white" />}
                        </div>
                        <span className="text-sm text-gray-700">{spec}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Insurance/Bonding/Mobile */}
                <div className="grid grid-cols-3 gap-4">
                  <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${formData.isInsured ? "bg-green-50 border-green-300" : "bg-white border-gray-200"}`}>
                    <input type="checkbox" checked={formData.isInsured} onChange={(e) => updateFormData("isInsured", e.target.checked)} className="sr-only" />
                    <Shield size={20} className={formData.isInsured ? "text-green-600" : "text-gray-400"} />
                    <span className="text-sm font-medium">Insured</span>
                  </label>
                  <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${formData.isBonded ? "bg-green-50 border-green-300" : "bg-white border-gray-200"}`}>
                    <input type="checkbox" checked={formData.isBonded} onChange={(e) => updateFormData("isBonded", e.target.checked)} className="sr-only" />
                    <Shield size={20} className={formData.isBonded ? "text-green-600" : "text-gray-400"} />
                    <span className="text-sm font-medium">Bonded</span>
                  </label>
                  <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${formData.hasMobileCapabilities ? "bg-captain-50 border-captain-300" : "bg-white border-gray-200"}`}>
                    <input type="checkbox" checked={formData.hasMobileCapabilities} onChange={(e) => updateFormData("hasMobileCapabilities", e.target.checked)} className="sr-only" />
                    <Truck size={20} className={formData.hasMobileCapabilities ? "text-captain-600" : "text-gray-400"} />
                    <span className="text-sm font-medium">Mobile Service</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={cancelEdit} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                  <button onClick={() => handleSave("credentials")} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-captain-600 text-white rounded-lg hover:bg-captain-700 disabled:opacity-50 transition-colors">
                    {isSaving ? "Saving..." : <><Save size={16} /> Save</>}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Certifications Display */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">Certifications</p>
                  {user.certifications && user.certifications.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {user.certifications.map((cert) => (
                        <span key={cert} className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                          <Award size={12} /> {cert}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No certifications listed</p>
                  )}
                </div>

                {/* Specializations Display */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">Specializations</p>
                  {user.specializations && user.specializations.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {user.specializations.map((spec) => (
                        <span key={spec} className="px-3 py-1 bg-captain-100 text-captain-700 rounded-full text-sm">{spec}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No specializations listed</p>
                  )}
                </div>

                {/* Badges */}
                <div className="flex gap-4">
                  {user.isInsured && (
                    <div className="flex items-center gap-2 text-green-700">
                      <Shield size={18} className="text-green-600" />
                      <span className="text-sm font-medium">Insured</span>
                    </div>
                  )}
                  {user.isBonded && (
                    <div className="flex items-center gap-2 text-green-700">
                      <Shield size={18} className="text-green-600" />
                      <span className="text-sm font-medium">Bonded</span>
                    </div>
                  )}
                  {user.hasMobileCapabilities !== false && (
                    <div className="flex items-center gap-2 text-captain-700">
                      <Truck size={18} className="text-captain-600" />
                      <span className="text-sm font-medium">Mobile Service Available</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* About & Links */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <SectionHeader 
            title="About & Links" 
            icon={Globe} 
            section="about"
            isEditing={editSection === "about"}
          />
        </div>
        
        {expandedSections.has("about") && (
          <div className="p-4">
            {editSection === "about" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">About Your Business</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => updateFormData("bio", e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20 resize-none"
                    placeholder="Tell boat owners about your experience and expertise..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input
                      type="url"
                      value={formData.websiteUrl}
                      onChange={(e) => updateFormData("websiteUrl", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Google My Business</label>
                    <input
                      type="url"
                      value={formData.googleMyBusinessUrl}
                      onChange={(e) => updateFormData("googleMyBusinessUrl", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                      placeholder="Google Business URL"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Languages Spoken</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={formData.languageInput}
                      onChange={(e) => updateFormData("languageInput", e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLanguage())}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                      placeholder="Add a language"
                    />
                    <button type="button" onClick={addLanguage} className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.languagesSpoken.map((lang) => (
                      <span key={lang} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {lang}
                        <button type="button" onClick={() => removeLanguage(lang)} className="hover:text-gray-900"><X size={14} /></button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={cancelEdit} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                  <button onClick={() => handleSave("about")} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-captain-600 text-white rounded-lg hover:bg-captain-700 disabled:opacity-50 transition-colors">
                    {isSaving ? "Saving..." : <><Save size={16} /> Save</>}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {user.bio ? (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">About</p>
                    <p className="text-sm text-gray-700">{user.bio}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No bio provided</p>
                )}
                
                <div className="flex gap-4">
                  {user.websiteUrl && (
                    <a href={user.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-captain-600 hover:text-captain-700 text-sm">
                      <Globe size={16} /> Website <ExternalLink size={12} />
                    </a>
                  )}
                  {user.googleMyBusinessUrl && (
                    <a href={user.googleMyBusinessUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-captain-600 hover:text-captain-700 text-sm">
                      <Globe size={16} /> Google Business <ExternalLink size={12} />
                    </a>
                  )}
                </div>

                {user.languagesSpoken && user.languagesSpoken.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Languages</p>
                    <div className="flex flex-wrap gap-2">
                      {user.languagesSpoken.map((lang) => (
                        <span key={lang} className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                          <Languages size={12} /> {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // If onClose is provided, wrap in a modal
  if (onClose) {
    return (
      <GlassModal onClose={onClose} className="max-w-4xl max-h-[90vh]">
          {/* Header with close button */}
          <div className={`sticky top-0 border-b px-6 py-4 flex items-center justify-between z-10 ${mode === 'dark' ? "bg-[#1A1A23] border-white/10" : "bg-white border-gray-200"}`}>
            <h2 className={`text-xl font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>My Profile</h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${mode === 'dark' ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            {profileContent}
          </div>
      </GlassModal>
    );
  }

  return profileContent;
}

export default MechanicProfile;
