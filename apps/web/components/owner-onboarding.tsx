"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ImageCropper } from "./image-cropper";
import { GlassCard, GlassButton, GlassBadge, GlassInput, GlassSelect, GlassModal } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";
import {
  User,
  Phone,
  MapPin,
  Mail,
  Camera,
  ChevronRight,
  Check,
  Anchor,
} from "lucide-react";

interface OwnerOnboardingProps {
  userName: string;
  userEmail: string;
  onComplete: () => void;
  onSkip: () => void;
}

export function OwnerOnboarding({
  userName,
  userEmail,
  onComplete,
  onSkip,
}: OwnerOnboardingProps) {
  const { mode } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Photo upload state
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);

  const completeOnboarding = useMutation(api.users.completeOwnerOnboarding);
  const skipOnboarding = useMutation(api.users.skipOwnerOnboarding);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const saveProfilePhoto = useMutation(api.storage.saveUserProfilePhoto);

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
  });

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle photo file selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    setImageToCrop(imageUrl);
  };

  // Handle cropped image upload
  const handleCroppedImage = async (croppedBlob: Blob) => {
    setIsUploadingPhoto(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: croppedBlob,
      });
      const { storageId } = await result.json();
      await saveProfilePhoto({ storageId });
      
      // Create a local URL for preview
      setUploadedPhotoUrl(URL.createObjectURL(croppedBlob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsUploadingPhoto(false);
      if (imageToCrop) {
        URL.revokeObjectURL(imageToCrop);
      }
      setImageToCrop(null);
      if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = "";
    }
  };

  // Cancel cropping
  const handleCropCancel = () => {
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
    }
    setImageToCrop(null);
    if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = "";
  };

  const canSubmit = () => {
    return (
      formData.firstName.trim() &&
      formData.lastName.trim() &&
      formData.phone.trim() &&
      formData.street.trim() &&
      formData.city.trim() &&
      formData.state.trim() &&
      formData.zipCode.trim()
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      await completeOnboarding({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
        },
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

  return (
    <GlassModal onClose={onSkip} className="max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-captain-600 to-captain-700 px-6 py-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Anchor className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Welcome to QR Captain!</h2>
                <p className="text-captain-100 text-sm">Let's set up your profile</p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              disabled={isSubmitting}
              className="text-sm text-captain-200 hover:text-white transition-colors"
            >
              Skip for now
            </button>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-2 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center ring-2 ring-white">
                <User size={16} />
              </div>
              <span className="text-sm font-medium">Your Profile</span>
            </div>
            <div className="flex-1 h-0.5 bg-white/20 mx-2" />
            <div className="flex items-center gap-2 opacity-50">
              <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                <Anchor size={16} />
              </div>
              <span className="text-sm">Add Vessel</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Profile Photo */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              {uploadedPhotoUrl ? (
                <img
                  src={uploadedPhotoUrl}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-captain-100"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-captain-100 flex items-center justify-center border-4 border-captain-50">
                  <User className="w-10 h-10 text-captain-400" />
                </div>
              )}
              <button
                onClick={() => profilePhotoInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-captain-600 rounded-full flex items-center justify-center shadow-lg hover:bg-captain-700 transition-colors disabled:opacity-50"
              >
                {isUploadingPhoto ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-white" />
                )}
              </button>
              <input
                ref={profilePhotoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>
          </div>
          <p className="text-center text-sm text-gray-500 mb-6">
            Add a profile photo (optional)
          </p>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User size={14} className="inline mr-1" />
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => updateFormData("firstName", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                placeholder="John"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User size={14} className="inline mr-1" />
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => updateFormData("lastName", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                placeholder="Smith"
              />
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail size={14} className="inline mr-1" />
                Email
              </label>
              <input
                type="email"
                value={userEmail}
                disabled
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone size={14} className="inline mr-1" />
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateFormData("phone", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin size={14} className="inline mr-1" />
                Address <span className="text-red-500">*</span>
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

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-between bg-gray-50">
          <p className="text-xs text-gray-500 self-center">
            Next: Add your first vessel
          </p>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit() || isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-captain-600 text-white rounded-lg hover:bg-captain-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Continue
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </div>
      {/* Image Cropper Modal */}
      {imageToCrop && (
        <ImageCropper
          imageSrc={imageToCrop}
          onCropComplete={handleCroppedImage}
          onCancel={handleCropCancel}
          aspectRatio={1}
        />
      )}
    </GlassModal>
  );
}

export default OwnerOnboarding;
