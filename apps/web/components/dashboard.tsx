"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useRef, useCallback, useEffect } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageCropper } from "./image-cropper";
import { EquipmentManifest } from "./equipment-manifest";
import { OwnerWorkOrderViewer } from "./owner-work-order-viewer";
import { QRCodeSVG } from "qrcode.react";
import { QRScanner } from "./qr-scanner";
import { VesselAccessModal } from "./vessel-access-modal";
import { NotificationBell, NotificationsPanel } from "./notifications";
import { AccessRequestModal, PendingAccessRequests } from "./access-request-modal";
import { AuthorizedVessels } from "./authorized-vessels";
import { MechanicOnboarding } from "./mechanic-onboarding";
import { MechanicProfile } from "./mechanic-profile";
import { OwnerOnboarding } from "./owner-onboarding";
import { VesselOnboarding } from "./vessel-onboarding";
import { OwnerProfile } from "./owner-profile";
import { WorkOrderEditor } from "./work-order-editor";
import { MechanicQuoteForm } from "./mechanic-quote-form";
import { QuoteViewer } from "./quote-viewer";
import { WorkOrderRequestForm } from "./work-order-request-form";
import { AdminControlPanel } from "./admin-control-panel";
import { GlassCard, GlassButton, GlassBadge, GlassInput, GlassSelect, GlassModal } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";
import {
  Anchor,
  Ship,
  User,
  X,
  Camera,
} from "lucide-react";

// ============================================
// PROFILE DROPDOWN COMPONENT
// ============================================

interface ProfileDropdownProps {
  user: {
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
    role?: string;
  };
  profilePhotoUrl: string | null;
  onProfileClick: () => void;
  onSignOut: () => void;
}

function ProfileDropdown({ user, profilePhotoUrl, onProfileClick, onSignOut }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { mode } = useTheme();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user.name || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {profilePhotoUrl ? (
          <img
            src={profilePhotoUrl}
            alt={displayName}
            className={`w-10 h-10 rounded-full object-cover border-2 transition-colors ${mode === 'dark' ? "border-blue-500/30 hover:border-blue-500" : "border-blue-200 hover:border-blue-400"}`}
          />
        ) : (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm border-2 transition-colors ${mode === 'dark' ? "bg-blue-600 text-white border-blue-400" : "bg-blue-100 text-blue-700 border-blue-200"}`}>
            {initials}
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <GlassCard className="absolute right-0 mt-2 w-64 py-2 z-50">
          {/* User Info */}
          <div className={`px-4 py-3 border-b ${mode === 'dark' ? "border-white/10" : "border-gray-100"}`}>
            <p className={`text-sm font-semibold truncate ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{displayName}</p>
            <p className={`text-xs truncate ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{user.email}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full capitalize ${mode === 'dark' ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700"}`}>
              {user.role}
            </span>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                onProfileClick();
              }}
              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors ${mode === 'dark' ? "text-gray-300 hover:bg-white/10" : "text-gray-700 hover:bg-gray-50"}`}
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              My Profile
            </button>
          </div>

          {/* Sign Out */}
          <div className={`border-t pt-1 ${mode === 'dark' ? "border-white/10" : "border-gray-100"}`}>
            <button
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors ${mode === 'dark' ? "text-red-400 hover:bg-red-500/10" : "text-red-600 hover:bg-red-50"}`}
            >
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

export function Dashboard() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const user = useQuery(api.users.currentUser);
  const profilePhotoUrl = useQuery(api.storage.getUserProfilePhotoUrl, {});
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<Id<"accessRequests"> | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const { mode } = useTheme();
  
  // Notification-linked states
  const [viewingQuoteId, setViewingQuoteId] = useState<Id<"workOrders"> | null>(null);
  const [viewingWorkOrderId, setViewingWorkOrderId] = useState<Id<"workOrders"> | null>(null);
  const [viewingOwnerWorkOrderId, setViewingOwnerWorkOrderId] = useState<Id<"workOrders"> | null>(null);
  const [viewingWorkOrderForRating, setViewingWorkOrderForRating] = useState<Id<"workOrders"> | null>(null);
  const [respondingToRequestId, setRespondingToRequestId] = useState<Id<"workOrders"> | null>(null);
  const [viewingVesselId, setViewingVesselId] = useState<Id<"vessels"> | null>(null);

  // Handle URL params from landing page notification clicks
  useEffect(() => {
    if (typeof window === "undefined" || !user) return;
    const params = new URLSearchParams(window.location.search);
    
    const viewWorkOrder = params.get("viewWorkOrder");
    const viewQuote = params.get("viewQuote");
    const respondToRequest = params.get("respondToRequest");
    const viewRating = params.get("viewRating");

    if (viewWorkOrder) {
      if (user.role === "owner") {
        setViewingOwnerWorkOrderId(viewWorkOrder as Id<"workOrders">);
      } else {
        setViewingWorkOrderId(viewWorkOrder as Id<"workOrders">);
      }
    } else if (viewQuote) {
      setViewingQuoteId(viewQuote as Id<"workOrders">);
    } else if (respondToRequest) {
      setRespondingToRequestId(respondToRequest as Id<"workOrders">);
    } else if (viewRating) {
      setViewingWorkOrderForRating(viewRating as Id<"workOrders">);
    }

    // Clean up URL params after processing
    if (viewWorkOrder || viewQuote || respondToRequest || viewRating) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("viewWorkOrder");
      cleanUrl.searchParams.delete("viewQuote");
      cleanUrl.searchParams.delete("respondToRequest");
      cleanUrl.searchParams.delete("viewRating");
      window.history.replaceState({}, "", cleanUrl.toString());
    }
  }, [user]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className={`h-8 w-8 animate-spin rounded-full border-4 ${mode === 'dark' ? "border-white/10 border-t-blue-500" : "border-gray-200 border-t-blue-600"}`}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className={`relative z-50 border-b backdrop-blur-md ${mode === 'dark' ? "bg-black/20 border-white/10" : "bg-white/80 border-gray-200"}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/home"
              onClick={() => {
                // Clear dashboard preference so user returns to home on next login
                localStorage.removeItem("qr-captain-prefer-dashboard");
              }}
              className={`text-2xl font-bold transition-colors flex items-center gap-2 ${mode === 'dark' ? "text-white hover:text-gray-200" : "text-gray-900 hover:text-gray-700"}`}
            >
              <img src="/qr-captain-logo.png" alt="QR Captain" className={`h-8 w-8 ${mode === 'dark' ? '' : 'brightness-0'}`} />
              <span className="font-heading">QR Captain</span>
            </Link>
            {/* Breadcrumb indicator showing we're in Dashboard */}
            <div className={`hidden sm:flex items-center gap-2 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className={`text-sm font-medium ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Home Button */}
            <Link
              href="/home"
              onClick={() => {
                // Clear dashboard preference so user returns to home on next login
                localStorage.removeItem("qr-captain-prefer-dashboard");
              }}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${mode === 'dark' ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"}`}
              title="Go to Home"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="hidden sm:inline">Home</span>
            </Link>
            {/* Notifications */}
            <div className="relative">
              <NotificationBell onClick={() => setShowNotifications(!showNotifications)} />
              <NotificationsPanel 
                isOpen={showNotifications} 
                onClose={() => setShowNotifications(false)}
                onViewRequest={(requestId) => {
                  setShowNotifications(false);
                  setSelectedRequestId(requestId);
                }}
                onViewQuote={(workOrderId) => {
                  setShowNotifications(false);
                  setViewingQuoteId(workOrderId);
                }}
                onViewWorkOrder={(workOrderId) => {
                  setShowNotifications(false);
                  // Route to appropriate viewer based on user role
                  if (user.role === "owner") {
                    setViewingOwnerWorkOrderId(workOrderId);
                  } else {
                    setViewingWorkOrderId(workOrderId);
                  }
                }}
                onRespondToRequest={(workOrderId) => {
                  setShowNotifications(false);
                  setRespondingToRequestId(workOrderId);
                }}
                onViewVessel={(vesselId) => {
                  setShowNotifications(false);
                  setViewingVesselId(vesselId);
                }}
                onLeaveRating={(workOrderId) => {
                  setShowNotifications(false);
                  setViewingWorkOrderForRating(workOrderId);
                }}
                onViewAnnouncement={() => {
                  setShowNotifications(false);
                  router.push("/home");
                }}
              />
            </div>
            
            {/* Profile Dropdown */}
            <ProfileDropdown
              user={user}
              profilePhotoUrl={profilePhotoUrl ?? null}
              onProfileClick={() => setShowProfile(true)}
              onSignOut={() => signOut()}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {user.role === "owner" && (
          <OwnerDashboard 
            onViewRequest={setSelectedRequestId}
          />
        )}
        {user.role === "mechanic" && <MechanicDashboard />}
        {user.role === "admin" && <AdminDashboard />}
      </main>

      {/* Access Request Modal */}
      {selectedRequestId && (
        <AccessRequestModal
          requestId={selectedRequestId}
          onClose={() => setSelectedRequestId(null)}
        />
      )}

      {/* Profile Modal - Role-specific */}
      {showProfile && user.role === "owner" && (
        <OwnerProfile onClose={() => setShowProfile(false)} />
      )}
      {showProfile && user.role === "mechanic" && (
        <MechanicProfile onClose={() => setShowProfile(false)} />
      )}

      {/* Notification-linked modals */}
      {/* Quote Viewer - Owner viewing mechanic's quote */}
      {viewingQuoteId && (
        <QuoteViewer
          workOrderId={viewingQuoteId}
          onClose={() => setViewingQuoteId(null)}
        />
      )}

      {/* Work Order Editor - View work order details (Mechanic view) */}
      {viewingWorkOrderId && (
        <WorkOrderEditor
          workOrderId={viewingWorkOrderId}
          onClose={() => setViewingWorkOrderId(null)}
        />
      )}

      {/* Owner Work Order Viewer - View work order details (Owner view) */}
      {viewingOwnerWorkOrderId && (
        <OwnerWorkOrderViewer
          workOrderId={viewingOwnerWorkOrderId}
          onClose={() => setViewingOwnerWorkOrderId(null)}
        />
      )}

      {/* Work Order Editor - For leaving a rating (opens to rating tab) */}
      {viewingWorkOrderForRating && (
        <WorkOrderEditor
          workOrderId={viewingWorkOrderForRating}
          onClose={() => setViewingWorkOrderForRating(null)}
          initialTab="rating"
        />
      )}

      {/* Mechanic Quote Form - Mechanic responding to work order request */}
      {respondingToRequestId && (
        <MechanicQuoteForm
          workOrderId={respondingToRequestId}
          onClose={() => setRespondingToRequestId(null)}
          onSuccess={() => setRespondingToRequestId(null)}
        />
      )}

      {/* Vessel Detail Modal - View vessel (e.g., after access approved) */}
      {viewingVesselId && (
        <VesselDetailModal
          vesselId={viewingVesselId}
          onClose={() => setViewingVesselId(null)}
        />
      )}
    </div>
  );
}

// ============================================
// OWNER MECHANICS VIEW
// ============================================

function OwnerMechanicsView() {
  const mechanics = useQuery(api.accessRequests.getMechanicsForOwner);
  const toggleAccess = useMutation(api.accessRequests.toggleMechanicAccess);
  const [togglingAccess, setTogglingAccess] = useState<string | null>(null);
  const [expandedMechanic, setExpandedMechanic] = useState<string | null>(null);
  const { mode } = useTheme();

  const handleToggleAccess = async (
    mechanicId: Id<"users">,
    vesselId: Id<"vessels">,
    currentStatus: boolean
  ) => {
    const key = `${mechanicId}-${vesselId}`;
    setTogglingAccess(key);
    try {
      await toggleAccess({
        mechanicId,
        vesselId,
        isActive: !currentStatus,
      });
    } catch (err) {
      console.error("Failed to toggle access:", err);
    } finally {
      setTogglingAccess(null);
    }
  };

  if (mechanics === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className={`h-8 w-8 animate-spin rounded-full border-4 ${mode === 'dark' ? "border-white/10 border-t-blue-500" : "border-gray-200 border-t-blue-600"}`}></div>
      </div>
    );
  }

  if (mechanics.length === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${mode === 'dark' ? "bg-white/5" : "bg-gray-100"}`}>
          <svg className={`w-8 h-8 ${mode === 'dark' ? "text-gray-400" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className={`text-lg font-semibold mb-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>No Mechanics Yet</h3>
        <p className={`max-w-md mx-auto ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
          When mechanics request access to your vessels or complete work orders, they'll appear here. 
          You can manage their access to your boats from this page.
        </p>
      </GlassCard>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Mechanics</h2>
          <p className={`text-sm mt-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
            Manage mechanic access to your vessels
          </p>
        </div>
        <div className={`flex items-center gap-2 text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Active Access
          </span>
          <span className="flex items-center gap-1 ml-4">
            <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
            No Access
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {mechanics.map((mechanic: any) => (
          <GlassCard 
            key={mechanic._id}
            className="overflow-hidden"
          >
            {/* Mechanic Header - Always Visible */}
            <div 
              className={`p-4 cursor-pointer transition-colors ${mode === 'dark' ? "hover:bg-white/5" : "hover:bg-gray-50"}`}
              onClick={() => setExpandedMechanic(
                expandedMechanic === mechanic._id ? null : mechanic._id
              )}
            >
              <div className="flex items-center gap-4">
                {/* Profile Photo */}
                {mechanic.profilePhotoUrl ? (
                  <img
                    src={mechanic.profilePhotoUrl}
                    alt={mechanic.name}
                    className={`w-14 h-14 rounded-full object-cover border-2 ${mode === 'dark' ? "border-white/10" : "border-gray-200"}`}
                  />
                ) : (
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 ${mode === 'dark' ? "bg-white/10 border-white/10" : "bg-captain-100 border-gray-200"}`}>
                    <span className={`text-xl font-semibold ${mode === 'dark' ? "text-white" : "text-captain-600"}`}>
                      {mechanic.name?.charAt(0)?.toUpperCase() || "M"}
                    </span>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold truncate ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{mechanic.name}</h3>
                    {mechanic.hasActiveAccess && (
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${mode === 'dark' ? "bg-green-500/20 text-green-300" : "bg-green-100 text-green-700"}`}>
                        Active
                      </span>
                    )}
                  </div>
                  {mechanic.companyName && (
                    <p className={`text-sm truncate ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>{mechanic.companyName}</p>
                  )}
                  <div className={`flex items-center gap-4 mt-1 text-xs ${mode === 'dark' ? "text-gray-500" : "text-gray-500"}`}>
                    {mechanic.completedOrderCount > 0 && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {mechanic.completedOrderCount} jobs completed
                      </span>
                    )}
                    {mechanic.lastWorkDate && (
                      <span>
                        Last work: {new Date(mechanic.lastWorkDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expand/Collapse Icon */}
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${mode === 'dark' ? "text-gray-500" : "text-gray-500"}`}>
                    {mechanic.vessels.length} vessel{mechanic.vessels.length !== 1 ? "s" : ""}
                  </span>
                  <svg 
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedMechanic === mechanic._id ? "rotate-180" : ""
                    }`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Expanded Content - Vessel Access Management */}
            {expandedMechanic === mechanic._id && (
              <div className={`border-t p-4 ${mode === 'dark' ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"}`}>
                {/* Contact Info */}
                <div className={`flex flex-wrap gap-4 mb-4 pb-4 border-b ${mode === 'dark' ? "border-white/10" : "border-gray-200"}`}>
                  {mechanic.email && (
                    <a 
                      href={`mailto:${mechanic.email}`}
                      className={`flex items-center gap-2 text-sm ${mode === 'dark' ? "text-blue-400 hover:text-blue-300" : "text-captain-600 hover:text-captain-700"}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {mechanic.email}
                    </a>
                  )}
                  {mechanic.phone && (
                    <a 
                      href={`tel:${mechanic.phone}`}
                      className={`flex items-center gap-2 text-sm ${mode === 'dark' ? "text-blue-400 hover:text-blue-300" : "text-captain-600 hover:text-captain-700"}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {mechanic.phone}
                    </a>
                  )}
                </div>

                {/* Vessel Access List */}
                <h4 className={`text-sm font-semibold mb-3 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>Vessel Access</h4>
                <div className="space-y-2">
                  {mechanic.vessels.map((vessel: any) => {
                    const toggleKey = `${mechanic._id}-${vessel.vesselId}`;
                    const isToggling = togglingAccess === toggleKey;
                    
                    return (
                      <div 
                        key={vessel.vesselId}
                        className={`flex items-center justify-between p-3 rounded-lg border ${mode === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}
                      >
                        <div className="flex items-center gap-3">
                          <Anchor className={`w-5 h-5 ${mode === 'dark' ? "text-blue-400" : "text-captain-600"}`} />
                          <div>
                            <p className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{vessel.vesselName}</p>
                            {vessel.authorizedAt && (
                              <p className={`text-xs ${mode === 'dark' ? "text-gray-500" : "text-gray-500"}`}>
                                Authorized: {new Date(vessel.authorizedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Access Toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleAccess(
                              mechanic._id as Id<"users">,
                              vessel.vesselId as Id<"vessels">,
                              vessel.isActive
                            );
                          }}
                          disabled={isToggling}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            vessel.isActive ? "bg-green-500" : (mode === 'dark' ? "bg-white/20" : "bg-gray-300")
                          } ${isToggling ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              vessel.isActive ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                          {isToggling && (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

// ============================================
// OWNER DASHBOARD
// ============================================

interface OwnerDashboardProps {
  onViewRequest: (requestId: Id<"accessRequests">) => void;
}

type OwnerOnboardingStage = "profile" | "vessel" | "complete";
type OwnerDashboardTab = "vessels" | "mechanics";

function OwnerDashboard({ onViewRequest }: OwnerDashboardProps) {
  const user = useQuery(api.users.currentUser);
  const vessels = useQuery(api.vessels.listMyVessels) ?? [];
  const onboardingStatus = useQuery(api.users.getOwnerOnboardingStatus);
  const pendingQuotes = useQuery(api.workOrders.getMyWorkOrderRequests, { status: "quoted" });
  const pendingRequests = useQuery(api.workOrders.getMyWorkOrderRequests, { status: "quote_requested" });
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVessel, setSelectedVessel] = useState<Id<"vessels"> | null>(null);
  const [activeTab, setActiveTab] = useState<OwnerDashboardTab>("vessels");
  const { mode } = useTheme();
  
  // Work Order Request state
  const [showWorkOrderRequest, setShowWorkOrderRequest] = useState(false);
  const [viewingQuoteId, setViewingQuoteId] = useState<Id<"workOrders"> | null>(null);
  
  // Onboarding flow state
  const [onboardingStage, setOnboardingStage] = useState<OwnerOnboardingStage | null>(null);
  const [hasInitializedOnboarding, setHasInitializedOnboarding] = useState(false);

  // Determine if we should show onboarding
  const shouldShowOnboarding = 
    onboardingStatus &&
    !onboardingStatus.isCompleted &&
    !onboardingStatus.wasSkipped &&
    !hasInitializedOnboarding;

  // Auto-start onboarding for new users
  if (shouldShowOnboarding && onboardingStage === null) {
    // Check if profile is complete but no vessel
    if (onboardingStatus.profileComplete && !onboardingStatus.hasVessel) {
      setOnboardingStage("vessel");
    } else if (!onboardingStatus.profileComplete) {
      setOnboardingStage("profile");
    }
    setHasInitializedOnboarding(true);
  }

  const handleProfileComplete = () => {
    // After profile, move to vessel onboarding
    setOnboardingStage("vessel");
  };

  const handleVesselComplete = () => {
    setOnboardingStage("complete");
    // Close onboarding
    setOnboardingStage(null);
  };

  const handleSkipProfile = () => {
    // User skipped profile, still show vessel onboarding
    setOnboardingStage("vessel");
  };

  const handleSkipVessel = () => {
    // User skipped vessel onboarding completely
    setOnboardingStage(null);
  };

  if (vessels === undefined || !user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className={`h-8 w-8 animate-spin rounded-full border-4 ${mode === 'dark' ? "border-white/10 border-t-blue-500" : "border-gray-200 border-t-blue-600"}`}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Owner Profile Onboarding */}
      {onboardingStage === "profile" && (
        <OwnerOnboarding
          userName={user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name || ""}
          userEmail={user.email || ""}
          onComplete={handleProfileComplete}
          onSkip={handleSkipProfile}
        />
      )}

      {/* Vessel Onboarding */}
      {onboardingStage === "vessel" && (
        <VesselOnboarding
          onComplete={handleVesselComplete}
          onSkip={handleSkipVessel}
        />
      )}

      {/* Pending Access Requests */}
      <PendingAccessRequests onViewRequest={onViewRequest} />

      {/* Profile Incomplete Banner */}
      {onboardingStatus && !onboardingStatus.isCompleted && onboardingStatus.wasSkipped && (
        <div className={`p-4 rounded-xl border ${mode === 'dark' ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-200"}`}>
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-amber-500/20" : "bg-amber-100"}`}>
              <User className={`w-5 h-5 ${mode === 'dark' ? "text-amber-400" : "text-amber-600"}`} />
            </div>
            <div className="flex-1">
              <h3 className={`font-medium ${mode === 'dark' ? "text-amber-200" : "text-amber-900"}`}>Complete Your Profile</h3>
              <p className={`text-sm mt-1 ${mode === 'dark' ? "text-amber-200/70" : "text-amber-700"}`}>
                Add your contact information to help mechanics reach you about service requests.
              </p>
              <button
                onClick={() => setOnboardingStage("profile")}
                className={`mt-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'dark' ? "bg-amber-500/20 text-amber-200 hover:bg-amber-500/30" : "bg-amber-600 text-white hover:bg-amber-700"}`}
              >
                Complete Profile Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Vessel Banner for users who have profile but no vessel */}
      {onboardingStatus && 
        onboardingStatus.profileComplete && 
        !onboardingStatus.hasVessel && 
        vessels.length === 0 && (
        <div className={`p-4 rounded-xl border ${mode === 'dark' ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50 border-blue-200"}`}>
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-blue-500/20" : "bg-blue-100"}`}>
              <Anchor className={`w-5 h-5 ${mode === 'dark' ? "text-blue-400" : "text-blue-600"}`} />
            </div>
            <div className="flex-1">
              <h3 className={`font-medium ${mode === 'dark' ? "text-blue-200" : "text-blue-900"}`}>Add Your First Vessel</h3>
              <p className={`text-sm mt-1 ${mode === 'dark' ? "text-blue-200/70" : "text-blue-700"}`}>
                Add your boat to start tracking maintenance and connecting with mechanics.
              </p>
              <button
                onClick={() => setOnboardingStage("vessel")}
                className={`mt-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'dark' ? "bg-blue-500/20 text-blue-200 hover:bg-blue-500/30" : "bg-blue-600 text-white hover:bg-blue-700"}`}
              >
                Add Vessel Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Request Work Order Button */}
          <GlassButton
            onClick={() => setShowWorkOrderRequest(true)}
            className="flex items-center gap-2 text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Request Work Order
          </GlassButton>
        </div>
      </div>

      {/* Pending Quotes Section - Quotes awaiting owner response */}
      {pendingQuotes && pendingQuotes.length > 0 && (
        <div className={`p-4 border-2 rounded-xl ${mode === 'dark' ? "bg-green-500/5 border-green-500/20" : "bg-green-50 border-green-200"}`}>
          <h3 className={`text-lg font-medium mb-3 flex items-center gap-2 ${mode === 'dark' ? "text-green-200" : "text-gray-900"}`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Quotes Ready for Review ({pendingQuotes.length})
          </h3>
          <div className="space-y-3">
            {pendingQuotes.map((quote) => (
              <GlassCard 
                key={quote._id}
                className={`p-4 border transition-all ${mode === 'dark' ? "hover:border-green-500/50" : "hover:border-green-300 border-green-200"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{quote.vesselName}</p>
                      <span className="text-gray-400">•</span>
                      <span className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{quote.mechanicCompany || quote.mechanicName}</span>
                    </div>
                    <p className={`text-sm mt-1 line-clamp-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>{quote.description}</p>
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2">
                      <span className={`text-lg font-bold ${mode === 'dark' ? "text-green-400" : "text-green-600"}`}>
                        ${(quote.quotedTotalEstimate || 0).toFixed(2)}
                      </span>
                      {quote.estimatedCompletionDate && (
                        <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${mode === 'dark' ? "bg-blue-500/10 text-blue-300" : "text-blue-600 bg-blue-50"}`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Est. {new Date(quote.estimatedCompletionDate).toLocaleDateString()}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        Quote received {quote.quotedAt ? new Date(quote.quotedAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                  </div>
                  <GlassButton
                    onClick={() => setViewingQuoteId(quote._id as Id<"workOrders">)}
                    className="text-sm py-2 px-4"
                  >
                    Review Quote
                  </GlassButton>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Pending Requests Section - Awaiting mechanic response */}
      {pendingRequests && pendingRequests.length > 0 && (
        <div className={`p-4 border-2 rounded-xl ${mode === 'dark' ? "bg-amber-500/5 border-amber-500/20" : "bg-orange-50 border-orange-200"}`}>
          <h3 className={`text-lg font-medium mb-3 flex items-center gap-2 ${mode === 'dark' ? "text-amber-200" : "text-gray-900"}`}>
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Awaiting Mechanic Response ({pendingRequests.length})
          </h3>
          <div className="space-y-2">
            {pendingRequests.map((request) => (
              <GlassCard 
                key={request._id}
                className="p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{request.vesselName}</span>
                    <span className="text-gray-400">|</span>
                    <span className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{request.mechanicCompany || request.mechanicName}</span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${mode === 'dark' ? "bg-amber-500/20 text-amber-300" : "bg-orange-100 text-orange-700"}`}>
                    Pending Quote
                  </span>
                </div>
                <p className={`text-xs mt-1 line-clamp-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{request.description}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className={`border-b ${mode === 'dark' ? "border-white/10" : "border-gray-200"}`}>
        <nav className="flex gap-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("vessels")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "vessels"
                ? (mode === 'dark' ? "border-blue-500 text-blue-400" : "border-blue-600 text-blue-600")
                : (mode === 'dark' ? "border-transparent text-gray-400 hover:text-white hover:border-gray-700" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300")
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              My Vessels
              {vessels.length > 0 && (
                <span className={`ml-1 px-2 py-0.5 text-xs font-medium rounded-full ${mode === 'dark' ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700"}`}>
                  {vessels.length}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("mechanics")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "mechanics"
                ? (mode === 'dark' ? "border-blue-500 text-blue-400" : "border-blue-600 text-blue-600")
                : (mode === 'dark' ? "border-transparent text-gray-400 hover:text-white hover:border-gray-700" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300")
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Mechanics
            </span>
          </button>
        </nav>
      </div>

      {/* Vessels Tab Content */}
      {activeTab === "vessels" && (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>My Vessels</h2>
            <GlassButton 
              onClick={() => setShowAddModal(true)}
              className="py-2 px-4 text-sm"
            >
              + Add Vessel
            </GlassButton>
          </div>

          {vessels.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <div className="mb-4"><Ship className={`w-12 h-12 mx-auto ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`} /></div>
          <p className={`mb-4 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
            No vessels yet. Add your first vessel to get started.
          </p>
          <GlassButton 
            onClick={() => setShowAddModal(true)}
          >
            + Add Your First Vessel
          </GlassButton>
        </GlassCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vessels.map((vessel) => (
            <GlassCard 
              key={vessel._id} 
              interactive
              className={`overflow-hidden cursor-pointer ${
                vessel.activeWorkOrderCount > 0 
                  ? (mode === 'dark' ? "border-amber-500/50 ring-2 ring-amber-500/20" : "border-amber-300 ring-2 ring-amber-100")
                  : ""
              }`}
              onClick={() => setSelectedVessel(vessel._id)}
            >
              {/* Vessel Photo */}
              <div className="relative">
                {vessel.imageUrl ? (
                  <div className="h-32 overflow-hidden">
                    <img 
                      src={vessel.imageUrl} 
                      alt={vessel.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className={`h-32 flex items-center justify-center ${mode === 'dark' ? "bg-gradient-to-br from-white/10 to-white/5" : "bg-gradient-to-br from-blue-100 to-blue-200"}`}>
                    <Ship className={`w-12 h-12 opacity-50 ${mode === 'dark' ? "text-gray-400" : "text-gray-400"}`} />
                  </div>
                )}
                
              </div>
              
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={`font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{vessel.name}</h3>
                    <p className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{vessel.make} {vessel.model}</p>
                    <p className={`text-sm ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>{vessel.year} • {vessel.vesselType}</p>
                  </div>
                  <Anchor className={`w-5 h-5 ${mode === 'dark' ? "text-blue-400" : "text-captain-600"}`} />
                </div>
                
                {vessel.registrationNumber && (
                  <p className="mt-2 text-xs text-gray-400">
                    Reg: {vessel.registrationNumber}
                  </p>
                )}
                
                {/* Work In Progress Tag */}
                {vessel.activeWorkOrderCount > 0 && (
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span className="text-xs font-medium text-amber-500">Work In Progress</span>
                  </div>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
        </>
      )}

      {/* Mechanics Tab Content */}
      {activeTab === "mechanics" && (
        <OwnerMechanicsView />
      )}

      {/* Add Vessel Modal */}
      {showAddModal && (
        <AddVesselModal onClose={() => setShowAddModal(false)} />
      )}

      {/* Vessel Detail Modal */}
      {selectedVessel && (
        <VesselDetailModal 
          vesselId={selectedVessel} 
          onClose={() => setSelectedVessel(null)} 
        />
      )}

      {/* Work Order Request Modal */}
      {showWorkOrderRequest && (
        <WorkOrderRequestForm
          onCancel={() => setShowWorkOrderRequest(false)}
          onSuccess={() => setShowWorkOrderRequest(false)}
        />
      )}

      {/* Quote Viewer Modal */}
      {viewingQuoteId && (
        <QuoteViewer
          workOrderId={viewingQuoteId}
          onClose={() => setViewingQuoteId(null)}
        />
      )}
    </div>
  );
}

function AddVesselModal({ onClose }: { onClose: () => void }) {
  const { mode } = useTheme();
  const createVessel = useMutation(api.vessels.createVessel);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    try {
      await createVessel({
        name: formData.get("name") as string,
        make: formData.get("make") as string,
        model: formData.get("model") as string,
        year: parseInt(formData.get("year") as string),
        vesselType: formData.get("vesselType") as string,
        registrationNumber: formData.get("registrationNumber") as string || undefined,
        hullId: formData.get("hullId") as string || undefined,
        notes: formData.get("notes") as string || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create vessel");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GlassModal onClose={onClose} className="max-w-lg">
        <div className={`flex items-center justify-between mb-6 pb-4 border-b ${mode === 'dark' ? "border-white/10" : "border-gray-200"}`}>
          <h2 className={`text-xl font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Add New Vessel</h2>
          <button onClick={onClose} className={`transition-colors ${mode === 'dark' ? "text-gray-400 hover:text-white" : "text-gray-400 hover:text-gray-600"}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
              Vessel Name *
            </label>
            <GlassInput
              name="name"
              required
              placeholder="e.g., Sea Breeze"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                Make *
              </label>
              <GlassInput
                name="make"
                required
                placeholder="e.g., Boston Whaler"
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                Model *
              </label>
              <GlassInput
                name="model"
                required
                placeholder="e.g., Outrage 330"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                Year *
              </label>
              <GlassInput
                name="year"
                type="number"
                required
                min="1900"
                max={new Date().getFullYear() + 1}
                placeholder="2023"
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                Vessel Type *
              </label>
              <GlassSelect
                name="vesselType"
                required
                options={[
                  { value: "powerboat", label: "Powerboat" },
                  { value: "sailboat", label: "Sailboat" },
                  { value: "yacht", label: "Yacht" },
                  { value: "fishing", label: "Fishing Boat" },
                  { value: "pontoon", label: "Pontoon" },
                  { value: "jet_ski", label: "Jet Ski / PWC" },
                  { value: "other", label: "Other" },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                Registration Number
              </label>
              <GlassInput
                name="registrationNumber"
                placeholder="FL 1234 AB"
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                Hull ID (HIN)
              </label>
              <GlassInput
                name="hullId"
                placeholder="ABC12345D678"
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
              Notes
            </label>
            <textarea
              name="notes"
              rows={3}
              className={`w-full rounded-lg px-4 py-2 focus:outline-none focus:ring-2 transition-all duration-200 ${
                mode === 'dark'
                  ? "bg-black/20 border border-white/10 text-white placeholder-gray-400 focus:border-blue-500/50 focus:ring-blue-500/50"
                  : "bg-white/50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:bg-white"
              }`}
              placeholder="Any additional information about your vessel..."
            />
          </div>

          {error && (
            <div className={`rounded-lg p-3 text-sm ${mode === 'dark' ? "bg-red-500/10 text-red-200 border border-red-500/20" : "bg-red-50 text-red-600"}`}>
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <GlassButton
              type="button"
              onClick={onClose}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </GlassButton>
            <GlassButton
              type="submit"
              disabled={isLoading}
              variant="primary"
              className="flex-1"
            >
              {isLoading ? "Creating..." : "Create Vessel"}
            </GlassButton>
          </div>
        </form>
    </GlassModal>
  );
}

function VesselDetailModal({ vesselId, onClose }: { vesselId: Id<"vessels">; onClose: () => void }) {
  const { mode } = useTheme();
  const vessel = useQuery(api.vessels.getVessel, { vesselId });
  const workOrders = useQuery(api.workOrders.getVesselWorkOrders, { vesselId });
  const vesselImageUrl = useQuery(api.storage.getVesselImageUrl, { vesselId });
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const saveVesselImage = useMutation(api.storage.saveVesselImage);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<Id<"workOrders"> | null>(null);
  const [showWorkOrderRequest, setShowWorkOrderRequest] = useState(false);

  // Handle file selection - show cropper first
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a URL for the selected file to show in cropper
    const imageUrl = URL.createObjectURL(file);
    setImageToCrop(imageUrl);
  };

  // Handle cropped image upload
  const handleCroppedImage = async (croppedBlob: Blob) => {
    setImageToCrop(null);
    setIsUploading(true);
    
    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();
      
      // Upload the cropped image
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: croppedBlob,
      });
      
      const { storageId } = await result.json();
      
      // Save to vessel
      await saveVesselImage({ vesselId, storageId });
    } catch (error) {
      console.error("Failed to upload photo:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Cancel cropping
  const handleCropCancel = () => {
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
    }
    setImageToCrop(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (vessel === undefined) {
    return (
      <GlassModal onClose={onClose} className="max-w-2xl h-[90vh]">
        <div className="p-8 flex items-center justify-center">
          <div className={`h-8 w-8 animate-spin rounded-full border-4 ${mode === 'dark' ? "border-white/10 border-t-blue-500" : "border-captain-200 border-t-captain-600"}`}></div>
        </div>
      </GlassModal>
    );
  }

  if (!vessel) {
    return null;
  }

  return (
    <>
      <GlassModal onClose={onClose} className="max-w-2xl max-h-[90vh]">
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${mode === 'dark' ? "border-white/10" : "border-gray-200"}`}>
          <div>
            <h2 className={`text-xl font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{vessel.name}</h2>
            <p className={`text-sm ${mode === 'dark' ? "text-gray-300" : "text-gray-500"}`}>{vessel.make} {vessel.model} ({vessel.year})</p>
          </div>
          <div className="flex items-center gap-3">
            <GlassButton
              onClick={() => setShowWorkOrderRequest(true)}
              variant="primary"
              className="text-sm py-1.5 px-3 h-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Request Service
            </GlassButton>
            <button onClick={onClose} className={`transition-colors ${mode === 'dark' ? "text-gray-400 hover:text-white" : "text-gray-400 hover:text-gray-600"}`}>
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Vessel Photo Section */}
          <div className="mb-6">
            <h3 className={`font-semibold mb-3 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Vessel Photo</h3>
            <div className="relative">
              {vesselImageUrl ? (
                <div className="relative rounded-xl overflow-hidden">
                  <img 
                    src={vesselImageUrl} 
                    alt={vessel.name}
                    className="w-full h-48 object-cover"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="absolute bottom-3 right-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-white shadow-sm"
                  >
                    {isUploading ? "Uploading..." : "Change Photo"}
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={`w-full h-48 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    mode === 'dark'
                      ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                      : "bg-gray-100 border-gray-300 hover:bg-gray-50 hover:border-captain-400"
                  }`}
                >
                  {isUploading ? (
                    <>
                      <div className={`h-8 w-8 animate-spin rounded-full border-4 mb-2 ${mode === 'dark' ? "border-white/10 border-t-blue-500" : "border-captain-200 border-t-captain-600"}`}></div>
                      <p className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Uploading...</p>
                    </>
                  ) : (
                    <>
                      <Camera className={`w-10 h-10 mb-2 ${mode === 'dark' ? "text-gray-400" : "text-gray-400"}`} />
                      <p className={`text-sm ${mode === 'dark' ? "text-gray-300" : "text-gray-500"}`}>Click to upload a photo of your vessel</p>
                      <p className={`text-xs mt-1 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>JPG, PNG up to 10MB</p>
                    </>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* QR Code Section */}
          <VesselQRCode 
            qrCodeData={vessel.qrCodeData} 
            vesselName={vessel.name}
          />

          {/* Vessel Details */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <span className={`text-sm ${mode === 'dark' ? "text-gray-300" : "text-gray-500"}`}>Type</span>
              <p className={`font-medium capitalize ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{vessel.vesselType.replace('_', ' ')}</p>
            </div>
            {vessel.registrationNumber && (
              <div>
                <span className={`text-sm ${mode === 'dark' ? "text-gray-300" : "text-gray-500"}`}>Registration</span>
                <p className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{vessel.registrationNumber}</p>
              </div>
            )}
            {vessel.hullId && (
              <div>
                <span className={`text-sm ${mode === 'dark' ? "text-gray-300" : "text-gray-500"}`}>Hull ID</span>
                <p className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{vessel.hullId}</p>
              </div>
            )}
          </div>

          {vessel.notes && (
            <div className="mb-6">
              <span className={`text-sm ${mode === 'dark' ? "text-gray-300" : "text-gray-500"}`}>Notes</span>
              <p className={mode === 'dark' ? "text-gray-300" : "text-gray-700"}>{vessel.notes}</p>
            </div>
          )}

          {/* Equipment Manifest Section */}
          <EquipmentManifest vesselId={vesselId} />

          {/* Active Work In Progress Status Bar */}
          {workOrders && workOrders.filter(wo => wo.status === 'in_progress').length > 0 && (
            <div className={`mt-6 p-3 rounded-lg border ${mode === 'dark' ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-200"}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className={`text-xs font-semibold uppercase tracking-wide ${mode === 'dark' ? "text-amber-200" : "text-amber-800"}`}>Work In Progress</span>
              </div>
              <div className="space-y-1.5">
                {workOrders.filter(wo => wo.status === 'in_progress').map((order) => (
                  <div 
                    key={order._id} 
                    onClick={() => setSelectedWorkOrderId(order._id)}
                    className={`flex items-center justify-between gap-2 text-xs p-2 -mx-2 rounded-md cursor-pointer transition-colors group ${mode === 'dark' ? "hover:bg-amber-500/20" : "hover:bg-amber-100"}`}
                  >
                    <span className={`truncate flex-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>{order.description}</span>
                    <span className={`flex-shrink-0 ${mode === 'dark' ? "text-amber-300" : "text-amber-600"}`}>{order.mechanicName || "Unknown"}</span>
                    <span className={`flex-shrink-0 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>{new Date(order.startedAt).toLocaleDateString()}</span>
                    <svg className={`w-4 h-4 flex-shrink-0 ${mode === 'dark' ? "text-amber-400/50 group-hover:text-amber-400" : "text-amber-400 group-hover:text-amber-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Work Orders Section */}
          <div className="mt-6">
            <h3 className={`font-semibold mb-2 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Service History</h3>
            {workOrders === undefined ? (
              <div className="text-center py-4">
                <div className={`h-6 w-6 animate-spin rounded-full border-2 mx-auto ${mode === 'dark' ? "border-white/10 border-t-blue-500" : "border-captain-200 border-t-captain-600"}`}></div>
              </div>
            ) : workOrders.filter(wo => wo.status !== 'in_progress').length === 0 ? (
              <div className={`text-center py-4 rounded-lg ${mode === 'dark' ? "bg-white/5" : "bg-gray-50"}`}>
                <p className={`text-xs ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>No completed service records yet</p>
              </div>
            ) : (
              <div className={`divide-y ${mode === 'dark' ? "divide-white/10" : "divide-gray-100"}`}>
                {workOrders.filter(wo => wo.status !== 'in_progress').map((order) => (
                  <div 
                    key={order._id} 
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        order.status === 'completed' ? 'bg-green-500' : 'bg-gray-400'
                      }`}></span>
                      <span className={`text-xs truncate ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>{order.description}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                      <span className={mode === 'dark' ? "text-gray-400" : "text-gray-500"}>{order.mechanicName}</span>
                      <span className="text-gray-500">•</span>
                      <span className={mode === 'dark' ? "text-gray-400" : "text-gray-500"}>{new Date(order.startedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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

      {/* Owner Work Order Viewer Modal */}
      {selectedWorkOrderId && (
        <OwnerWorkOrderViewer
          workOrderId={selectedWorkOrderId}
          onClose={() => setSelectedWorkOrderId(null)}
        />
      )}

      {/* Work Order Request Modal - with vessel pre-selected */}
      {showWorkOrderRequest && (
        <WorkOrderRequestForm
          preSelectedVesselId={vesselId}
          onCancel={() => setShowWorkOrderRequest(false)}
          onSuccess={() => setShowWorkOrderRequest(false)}
        />
      )}
    </>
  );
}

// ============================================
// MECHANIC DASHBOARD
// ============================================

function MechanicDashboard() {
  const user = useQuery(api.users.currentUser);
  const onboardingStatus = useQuery(api.users.getMechanicOnboardingStatus);
  const workOrders = useQuery(api.workOrders.getMyWorkOrders, {});
  const pendingRequests = useQuery(api.workOrders.getPendingQuoteRequests);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedVessel, setScannedVessel] = useState<any>(null);
  const [selectedVessel, setSelectedVessel] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [editingWorkOrderId, setEditingWorkOrderId] = useState<Id<"workOrders"> | null>(null);
  const [selectedPendingRequestId, setSelectedPendingRequestId] = useState<Id<"workOrders"> | null>(null);
  const { mode } = useTheme();

  // Show onboarding modal for new mechanics who haven't completed or skipped
  const shouldShowOnboarding = onboardingStatus && 
    !onboardingStatus.isCompleted && 
    !onboardingStatus.wasSkipped;

  // Check if mechanic can access features (must have completed onboarding)
  const canAccessFeatures = onboardingStatus?.isCompleted === true;

  if (workOrders === undefined || onboardingStatus === undefined || user === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className={`h-8 w-8 animate-spin rounded-full border-4 ${mode === 'dark' ? "border-white/10 border-t-blue-500" : "border-gray-200 border-t-blue-600"}`}></div>
      </div>
    );
  }

  const activeOrders = workOrders.filter(o => o.status === 'in_progress');
  const completedOrders = workOrders.filter(o => o.status === 'completed');

  // Handle vessel selection from authorized vessels list
  const handleSelectVessel = (vessel: any) => {
    if (!canAccessFeatures) {
      setShowOnboarding(true);
      return;
    }
    // Transform the vessel to match the expected format for VesselAccessModal
    setSelectedVessel({
      _id: vessel._id,
      name: vessel.name,
      make: vessel.make,
      model: vessel.model,
      year: vessel.year,
      vesselType: vessel.vesselType,
      ownerName: vessel.owner?.name,
      ownerEmail: vessel.owner?.email,
      workOrderCount: vessel.stats?.totalWorkOrders || 0,
      qrCodeData: vessel.qrCodeData,
    });
  };

  const handleScanClick = () => {
    if (!canAccessFeatures) {
      setShowOnboarding(true);
      return;
    }
    setShowScanner(true);
  };

  return (
    <div className="space-y-8">
      {/* Onboarding Modal - Show automatically for new mechanics */}
      {(shouldShowOnboarding || showOnboarding) && user && (
        <MechanicOnboarding
          userName={user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name || ""}
          companyName={user.companyName || ""}
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      )}

      {/* Main Content */}
      <>
          {/* Profile Incomplete Banner - Show if skipped but not completed */}
          {onboardingStatus && !onboardingStatus.isCompleted && onboardingStatus.wasSkipped && (
            <div className={`p-4 rounded-xl border ${mode === 'dark' ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-200"}`}>
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-amber-500/20" : "bg-amber-100"}`}>
                  <svg className={`w-5 h-5 ${mode === 'dark' ? "text-amber-400" : "text-amber-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold ${mode === 'dark' ? "text-amber-200" : "text-amber-800"}`}>Complete Your Profile</h3>
                  <p className={`text-sm mt-1 ${mode === 'dark' ? "text-amber-200/70" : "text-amber-700"}`}>
                    Your profile is {onboardingStatus.progressPercent}% complete. 
                    Complete your profile to scan QR codes, request access to vessels, and contact boat owners.
                  </p>
                  <button
                    onClick={() => setShowOnboarding(true)}
                    className={`mt-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'dark' ? "bg-amber-500/20 text-amber-200 hover:bg-amber-500/30" : "bg-amber-600 text-white hover:bg-amber-700"}`}
                  >
                    Complete Profile Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Authorized Vessels Section */}
          <AuthorizedVessels onSelectVessel={handleSelectVessel} />

      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>My Work Orders</h2>
        <GlassButton 
          onClick={handleScanClick}
          disabled={!canAccessFeatures}
          className={`flex items-center gap-2 ${!canAccessFeatures ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          Scan QR Code
          {!canAccessFeatures && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
        </GlassButton>
      </div>

      {/* Pending Work Order Requests */}
      {pendingRequests && pendingRequests.length > 0 && (
        <div className="mb-8">
          <h3 className={`text-lg font-medium mb-4 flex items-center gap-2 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            Pending Requests ({pendingRequests.length})
          </h3>
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <GlassCard 
                key={request._id} 
                className={`p-4 border-2 transition-all ${mode === 'dark' ? "border-orange-500/20 bg-orange-500/5 hover:border-orange-500/40" : "border-orange-200 bg-orange-50 hover:border-orange-300"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{request.vesselName}</p>
                      <span className="text-gray-400">•</span>
                      <span className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{request.ownerName || "Owner"}</span>
                    </div>
                    <p className={`text-sm mt-1 line-clamp-2 ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>{request.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        request.urgency === "urgent" 
                          ? (mode === 'dark' ? "bg-red-500/20 text-red-300" : "bg-red-100 text-red-700")
                          : request.urgency === "soon" 
                          ? (mode === 'dark' ? "bg-yellow-500/20 text-yellow-300" : "bg-yellow-100 text-yellow-700")
                          : (mode === 'dark' ? "bg-white/10 text-gray-400" : "bg-gray-100 text-gray-600")
                      }`}>
                        {request.urgency === "urgent" ? "Urgent" : request.urgency === "soon" ? "Soon" : "Routine"}
                      </span>
                      <span className={`text-xs ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>
                        Requested {new Date(request.startedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${mode === 'dark' ? "bg-orange-500/20 text-orange-300" : "bg-orange-100 text-orange-700"}`}>
                      Quote Requested
                    </span>
                    <GlassButton
                      onClick={() => setSelectedPendingRequestId(request._id as Id<"workOrders">)}
                      className="text-sm py-1.5 px-3"
                    >
                      Respond
                    </GlassButton>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Active Work Orders */}
      <div className="mb-8">
        <h3 className={`text-lg font-medium mb-4 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
          Active ({activeOrders.length})
        </h3>
        {activeOrders.length === 0 ? (
          <GlassCard className="p-6 text-center">
            <p className={mode === 'dark' ? "text-gray-400" : "text-gray-500"}>No active work orders</p>
            <p className={`text-sm mt-1 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>Scan a vessel QR code or select from authorized vessels to start a work order</p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <GlassCard 
                key={order._id} 
                interactive
                onClick={() => setEditingWorkOrderId(order._id as Id<"workOrders">)}
                className="p-4 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{order.vesselName}</p>
                      <span className="text-gray-400">•</span>
                      <span className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{order.vesselMake} {order.vesselModel}</span>
                    </div>
                    <p className={`text-sm mt-1 line-clamp-2 ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>{order.description}</p>
                    <p className={`text-xs mt-2 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>
                      Started {new Date(order.startedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${mode === 'dark' ? "bg-yellow-500/20 text-yellow-300" : "bg-yellow-100 text-yellow-700"}`}>
                      In Progress
                    </span>
                    <button className={`text-sm font-medium flex items-center gap-1 ${mode === 'dark' ? "text-blue-400 hover:text-blue-300" : "text-captain-600 hover:text-captain-700"}`}>
                      Continue
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* Completed Work Orders */}
      <div>
        <h3 className={`text-lg font-medium mb-4 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
          Completed ({completedOrders.length})
        </h3>
        {completedOrders.length === 0 ? (
          <GlassCard className="p-6 text-center">
            <p className={mode === 'dark' ? "text-gray-400" : "text-gray-500"}>No completed work orders</p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {completedOrders.slice(0, 5).map((order) => (
              <GlassCard key={order._id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{order.vesselName}</p>
                    <p className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>{order.description}</p>
                    <p className={`text-xs mt-1 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>
                      Completed {order.completedAt ? new Date(order.completedAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${mode === 'dark' ? "bg-green-500/20 text-green-300" : "bg-green-100 text-green-700"}`}>
                    Completed
                  </span>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          onClose={() => setShowScanner(false)}
          onVesselFound={(vessel) => {
            setShowScanner(false);
            setScannedVessel(vessel);
          }}
        />
      )}

      {/* Scanned Vessel Access Modal - handles access request flow */}
      {scannedVessel && (
        <VesselAccessModal
          vessel={scannedVessel}
          onClose={() => setScannedVessel(null)}
          onStartWorkOrder={() => {
            setScannedVessel(null);
          }}
        />
      )}

      {/* Selected Vessel Modal - from authorized vessels list */}
      {selectedVessel && (
        <VesselAccessModal
          vessel={selectedVessel}
          onClose={() => setSelectedVessel(null)}
          onStartWorkOrder={() => {
            setSelectedVessel(null);
          }}
        />
      )}

      {/* Work Order Editor Modal */}
      {editingWorkOrderId && (
        <WorkOrderEditor
          workOrderId={editingWorkOrderId}
          onClose={() => setEditingWorkOrderId(null)}
          onCompleted={() => setEditingWorkOrderId(null)}
        />
      )}

      {/* Mechanic Quote Form Modal - for responding to pending requests */}
      {selectedPendingRequestId && (
        <MechanicQuoteForm
          workOrderId={selectedPendingRequestId}
          onClose={() => setSelectedPendingRequestId(null)}
          onSuccess={() => setSelectedPendingRequestId(null)}
        />
      )}
      </>
    </div>
  );
}

// ============================================
// ADMIN DASHBOARD
// ============================================

function AdminDashboard() {
  const stats = useQuery(api.vessels.getAdminStats);
  const isPartsSeeded = useQuery(api.parts.isSeeded);
  const seedParts = useMutation(api.seedParts.seedInitialParts);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showControlPanel, setShowControlPanel] = useState(false);
  const { mode } = useTheme();

  const handleSeedParts = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    try {
      const result = await seedParts();
      setSeedResult(result);
    } catch (err) {
      setSeedResult({ success: false, message: err instanceof Error ? err.message : "Failed to seed parts" });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with Control Panel Button */}
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
          Admin Dashboard
        </h2>
        <GlassButton
          onClick={() => setShowControlPanel(true)}
          className="flex items-center gap-2 text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Control Panel
        </GlassButton>
      </div>

      {/* Admin Control Panel Modal */}
      {showControlPanel && (
        <AdminControlPanel onClose={() => setShowControlPanel(false)} />
      )}
      
      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <GlassCard className="p-6">
          <h3 className={`text-lg font-semibold ${mode === 'dark' ? "text-gray-300" : "text-gray-900"}`}>Users</h3>
          <p className={`mt-2 text-3xl font-bold ${mode === 'dark' ? "text-blue-400" : "text-captain-600"}`}>
            {stats?.userCount ?? "--"}
          </p>
        </GlassCard>
        <GlassCard className="p-6">
          <h3 className={`text-lg font-semibold ${mode === 'dark' ? "text-gray-300" : "text-gray-900"}`}>Vessels</h3>
          <p className={`mt-2 text-3xl font-bold ${mode === 'dark' ? "text-blue-400" : "text-captain-600"}`}>
            {stats?.vesselCount ?? "--"}
          </p>
        </GlassCard>
        <GlassCard className="p-6">
          <h3 className={`text-lg font-semibold ${mode === 'dark' ? "text-gray-300" : "text-gray-900"}`}>Work Orders</h3>
          <p className={`mt-2 text-3xl font-bold ${mode === 'dark' ? "text-blue-400" : "text-captain-600"}`}>
            {stats?.workOrderCount ?? "--"}
          </p>
        </GlassCard>
      </div>

      {/* Database Management */}
      <GlassCard className="p-6">
        <h3 className={`text-lg font-semibold mb-4 ${mode === 'dark' ? "text-gray-300" : "text-gray-900"}`}>Database Management</h3>
        
        {/* Seed Parts Database */}
        <div className={`flex items-center justify-between p-4 rounded-lg ${mode === 'dark' ? "bg-white/5" : "bg-gray-50"}`}>
          <div>
            <h4 className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Parts Database</h4>
            <p className={`text-sm mt-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
              {isPartsSeeded === undefined 
                ? "Checking status..." 
                : isPartsSeeded 
                  ? "Database has been seeded with common marine parts" 
                  : "Seed the database with ~25 common marine parts (oil filters, impellers, anodes, etc.)"}
            </p>
            {seedResult && (
              <p className={`text-sm mt-2 ${seedResult.success ? "text-green-500" : "text-red-500"}`}>
                {seedResult.message}
              </p>
            )}
          </div>
          <button
            onClick={handleSeedParts}
            disabled={isSeeding || isPartsSeeded === true}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              isPartsSeeded
                ? "bg-green-500/20 text-green-500 cursor-default"
                : (mode === 'dark' ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-captain-600 text-white hover:bg-captain-700")
            } disabled:opacity-50`}
          >
            {isSeeding ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Seeding...
              </>
            ) : isPartsSeeded ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Seeded
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
                Seed Parts Database
              </>
            )}
          </button>
        </div>
      </GlassCard>

      {/* Recent Activity */}
      <RecentActivityFeed />
    </div>
  );
}

// ============================================
// RECENT ACTIVITY FEED COMPONENT
// ============================================

function RecentActivityFeed() {
  const activities = useQuery(api.settings.getRecentActivity, { limit: 15 });
  const { mode } = useTheme();

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "user_signup":
        return (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-600"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        );
      case "vessel_added":
        return (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-cyan-500/20 text-cyan-300" : "bg-captain-100 text-captain-600"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        );
      case "work_order_created":
        return (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-orange-500/20 text-orange-300" : "bg-orange-100 text-orange-600"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        );
      case "work_order_completed":
        return (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-green-500/20 text-green-300" : "bg-green-100 text-green-600"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case "rating_submitted":
        return (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-yellow-500/20 text-yellow-300" : "bg-yellow-100 text-yellow-600"}`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        );
      case "access_request":
        return (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-600"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-white/10 text-gray-400" : "bg-gray-100 text-gray-600"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return new Date(timestamp).toLocaleDateString();
    } else if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return "Just now";
    }
  };

  return (
    <GlassCard className="p-6">
      <h3 className={`text-lg font-semibold mb-4 ${mode === 'dark' ? "text-gray-300" : "text-gray-900"}`}>Recent Activity</h3>
      
      {!activities && (
        <div className="flex items-center justify-center py-8">
          <div className={`w-6 h-6 border-2 border-t-transparent rounded-full animate-spin ${mode === 'dark' ? "border-blue-500" : "border-captain-600"}`}></div>
        </div>
      )}

      {activities && activities.length === 0 && (
        <p className={`text-center py-8 ${mode === 'dark' ? "text-gray-500" : "text-gray-500"}`}>
          No recent activity
        </p>
      )}

      {activities && activities.length > 0 && (
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              {getActivityIcon(activity.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-medium truncate ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
                    {activity.title}
                  </p>
                  <span className={`text-xs whitespace-nowrap ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>
                <p className={`text-sm truncate ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                  {activity.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

// ============================================
// VESSEL QR CODE COMPONENT
// ============================================

function VesselQRCode({ qrCodeData, vesselName }: { qrCodeData: string; vesselName: string }) {
  const qrRef = useRef<HTMLDivElement>(null);

  // Download QR code as PNG
  const handleDownload = useCallback(() => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    // Create canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size with padding for label
    const qrSize = 256;
    const padding = 32;
    const labelHeight = 60;
    canvas.width = qrSize + padding * 2;
    canvas.height = qrSize + padding * 2 + labelHeight;

    // Fill white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Convert SVG to image
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      // Draw QR code
      ctx.drawImage(img, padding, padding, qrSize, qrSize);

      // Add vessel name label
      ctx.fillStyle = "#1f2937";
      ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(vesselName, canvas.width / 2, qrSize + padding + 30);

      // Add QR code ID
      ctx.fillStyle = "#6b7280";
      ctx.font = "12px monospace";
      ctx.fillText(qrCodeData, canvas.width / 2, qrSize + padding + 50);

      // Download
      const link = document.createElement("a");
      link.download = `${vesselName.replace(/[^a-z0-9]/gi, "_")}_QR.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [qrCodeData, vesselName]);

  // Print QR code
  const handlePrint = useCallback(() => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${vesselName}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .qr-container {
              text-align: center;
              padding: 40px;
              border: 2px solid #e5e7eb;
              border-radius: 16px;
              background: white;
            }
            .qr-code {
              width: 200px;
              height: 200px;
              margin-bottom: 20px;
            }
            h2 {
              margin: 0 0 8px 0;
              color: #1f2937;
              font-size: 24px;
            }
            .code-id {
              font-family: monospace;
              color: #6b7280;
              font-size: 14px;
            }
            .instructions {
              margin-top: 16px;
              font-size: 12px;
              color: #9ca3af;
            }
            @media print {
              body { 
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .qr-container {
                border: 1px solid #000;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="qr-code">
              ${qrRef.current?.innerHTML || ""}
            </div>
            <h2>${vesselName}</h2>
            <div class="code-id">${qrCodeData}</div>
            <div class="instructions">Scan with QR Captain app to access vessel service history</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }, [qrCodeData, vesselName]);

  return (
    <div className="mb-6 p-4 bg-gradient-to-br from-captain-50 to-captain-100 rounded-xl">
      <div className="text-center">
        {/* QR Code */}
        <div 
          ref={qrRef}
          className="inline-block p-4 bg-white rounded-xl shadow-sm mb-3"
        >
          <QRCodeSVG
            value={qrCodeData}
            size={160}
            level="H"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#0c4a6e"
          />
        </div>
        
        <p className="text-sm text-gray-600 mb-1">
          Scan this QR code to access vessel history
        </p>
        <p className="text-xs text-captain-600 font-mono mb-4">
          {qrCodeData}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-center">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-captain-700 bg-white border border-captain-200 rounded-lg hover:bg-captain-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-captain-700 bg-white border border-captain-200 rounded-lg hover:bg-captain-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
