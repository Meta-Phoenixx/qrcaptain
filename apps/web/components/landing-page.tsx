"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useRef, useEffect } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { GlassCard, GlassButton, GlassBadge } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";

// Fleet manager redirect — gates on onboarding completion
function FleetManagerRedirect({ onboardingCompleted }: { onboardingCompleted?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (onboardingCompleted === undefined) return; // still loading
    router.replace(onboardingCompleted ? "/fleet" : "/onboarding/fleet-manager");
  }, [router, onboardingCompleted]);
  return null;
}

// Import landing page components
import { AnnouncementsFeed } from "./announcements-feed";
import { HelpGuides, HelpButton } from "./help-guides";
import { ActivityFeed } from "./activity-feed";
import { ServiceReminders, ServiceReminderBadge } from "./service-reminders";
import { FeaturedMechanics, FeaturedMechanicsBadge } from "./featured-mechanics";
import { NotificationBell, NotificationsPanel } from "./notifications";
import { MechanicSpotlight } from "./mechanic-spotlight";
import { MechanicProfile } from "./mechanic-profile";
import { OwnerProfile } from "./owner-profile";

// ============================================
// PROFILE DROPDOWN (Shared with dashboard)
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
        <div className={`absolute right-0 mt-2 w-64 py-2 z-50 rounded-2xl border backdrop-blur-xl overflow-hidden ${
          mode === 'dark'
            ? "bg-gray-900/95 border-white/10 shadow-[0_4px_24px_-1px_rgba(0,0,0,0.4)]"
            : "bg-white/95 border-gray-200 shadow-[0_4px_24px_-1px_rgba(0,0,0,0.12)]"
        }`}>
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
        </div>
      )}
    </div>
  );
}

// ============================================
// QUICK ACTIONS COMPONENT
// ============================================

interface QuickAction {
  label: string;
  icon: JSX.Element;
  onClick: () => void;
  variant?: "primary" | "secondary";
}

function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action, index) => (
        <GlassButton
          key={index}
          onClick={action.onClick}
          variant={action.variant === "primary" ? "primary" : "secondary"}
          className="text-sm py-2.5 px-4"
        >
          {action.icon}
          {action.label}
        </GlassButton>
      ))}
    </div>
  );
}

// ============================================
// STATS CARD COMPONENT
// ============================================

interface StatItem {
  label: string;
  value: number | string;
  icon: JSX.Element;
  color: string;
  onClick?: () => void;
}

function StatsCard({ title, stats }: { title: string; stats: StatItem[] }) {
  const { mode } = useTheme();
  return (
    <GlassCard className="p-6">
      <h3 className={`text-sm font-medium mb-4 ${mode === 'dark' ? "text-gray-300" : "text-gray-500"}`}>{title}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`text-center rounded-xl p-2 transition-all ${stat.onClick ? "cursor-pointer hover:bg-white/5 active:scale-95" : ""}`}
            onClick={stat.onClick}
          >
            <div className={`inline-flex p-3 rounded-xl mb-2 ${stat.color} bg-opacity-20`}>
              {stat.icon}
            </div>
            <p className={`text-2xl font-bold font-heading ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{stat.value}</p>
            <p className={`text-xs ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{stat.label}</p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

// ============================================
// SECTION CARD COMPONENT
// ============================================

function SectionCard({ 
  title, 
  badge,
  children,
  action 
}: { 
  title: string; 
  badge?: React.ReactNode;
  children: React.ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  const { mode } = useTheme();
  return (
    <GlassCard>
      <div className={`flex items-center justify-between px-6 py-4 border-b ${mode === 'dark' ? "border-white/10" : "border-gray-100"}`}>
        <div className="flex items-center gap-3">
          <h3 className={`font-semibold font-heading ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{title}</h3>
          {badge}
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className={`text-sm font-medium transition-colors ${mode === 'dark' ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
          >
            {action.label}
          </button>
        )}
      </div>
      <div className="p-6">{children}</div>
    </GlassCard>
  );
}

// ============================================
// OWNER LANDING PAGE
// ============================================

function OwnerLandingPage({ 
  user, 
  onViewDashboard,
  onViewMechanics,
}: { 
  user: any;
  onViewDashboard: () => void;
  onViewMechanics: () => void;
}) {
  const router = useRouter();
  const vessels = useQuery(api.vessels.listMyVessels);
  const workOrderRequests = useQuery(api.workOrders.getMyWorkOrderRequests, {});
  const [selectedMechanicId, setSelectedMechanicId] = useState<Id<"users"> | null>(null);
  const { mode } = useTheme();

  // Calculate stats
  const vesselCount = vessels?.length || 0;
  const activeWorkOrders = workOrderRequests?.filter(
    (wo) => wo.status === "in_progress" || wo.status === "quote_requested" || wo.status === "quoted"
  ).length || 0;
  const pendingQuotes = workOrderRequests?.filter(wo => wo.status === "quoted").length || 0;

  const ownerStats: StatItem[] = [
    {
      label: "Vessels",
      value: vesselCount,
      icon: <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>,
      color: "bg-blue-500",
      onClick: onViewDashboard,
    },
    {
      label: "Active Work Orders",
      value: activeWorkOrders,
      icon: <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
      color: "bg-green-500",
      onClick: onViewDashboard,
    },
    {
      label: "Pending Quotes",
      value: pendingQuotes,
      icon: <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      color: "bg-amber-500",
      onClick: onViewDashboard,
    },
    {
      label: "Completed",
      value: workOrderRequests?.filter(wo => wo.status === "completed").length || 0,
      icon: <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
      color: "bg-purple-500",
      onClick: onViewDashboard,
    },
  ];

  const quickActions: QuickAction[] = [
    {
      label: "Request Service",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>,
      onClick: onViewDashboard,
      variant: "primary",
    },
    {
      label: "Find a Mechanic",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
      onClick: onViewMechanics,
    },
    {
      label: "My Vessels",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
      onClick: onViewDashboard,
    },
    {
      label: "View Dashboard",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>,
      onClick: onViewDashboard,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome and Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold font-heading ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
            Welcome back, {user.firstName || "Captain"}!
          </h2>
          <p className={mode === 'dark' ? "text-gray-300" : "text-gray-600"}>Here's what's happening with your fleet</p>
        </div>
        <QuickActions actions={quickActions} />
      </div>

      {/* Stats */}
      <StatsCard title="Fleet Overview" stats={ownerStats} />

      {/* Announcements */}
      <AnnouncementsFeed maxItems={3} />

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Reminders */}
        <SectionCard 
          title="Upcoming Maintenance" 
          badge={<ServiceReminderBadge />}
        >
          <ServiceReminders maxItems={4} />
        </SectionCard>

        {/* Featured Mechanics */}
        <SectionCard 
          title="Featured Mechanics"
          badge={<FeaturedMechanicsBadge />}
          action={{ label: "View All", onClick: onViewMechanics }}
        >
          <FeaturedMechanics 
            maxItems={4} 
            onMechanicClick={setSelectedMechanicId}
            onViewDirectory={onViewMechanics}
          />
        </SectionCard>

        {/* Activity Feed */}
        <SectionCard title="Recent Activity">
          <ActivityFeed maxItems={6} />
        </SectionCard>

        {/* Help Guides */}
        <SectionCard title="Help & Guides">
          <HelpGuides maxItems={4} />
        </SectionCard>
      </div>

      {/* Mechanic Spotlight Modal */}
      {selectedMechanicId && (
        <MechanicSpotlight
          mechanicId={selectedMechanicId}
          onClose={() => setSelectedMechanicId(null)}
        />
      )}
    </div>
  );
}

// ============================================
// MECHANIC LANDING PAGE
// ============================================

function MechanicLandingPage({
  user,
  onViewDashboard,
}: {
  user: any;
  onViewDashboard: () => void;
}) {
  const router = useRouter();
  const mechanicStats = useQuery(api.mechanicDirectory.getMechanicStats);
  const { mode } = useTheme();

  const stats: StatItem[] = [
    {
      label: "Active Jobs",
      value: mechanicStats?.activeJobs || 0,
      icon: <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      color: "bg-blue-500",
      onClick: () => router.push("/work-orders"),
    },
    {
      label: "Pending Requests",
      value: mechanicStats?.pendingQuoteRequests || 0,
      icon: <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      color: "bg-amber-500",
      onClick: () => router.push("/work-orders"),
    },
    {
      label: "Completed This Month",
      value: mechanicStats?.completedThisMonth || 0,
      icon: <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
      color: "bg-green-500",
      onClick: () => router.push("/work-orders"),
    },
    {
      label: "Total Jobs",
      value: mechanicStats?.totalJobsCompleted || 0,
      icon: <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
      color: "bg-purple-500",
      onClick: () => router.push("/work-orders"),
    },
  ];

  const fleets = useQuery(api.fleetDashboard.listAllFleetsDashboard) ?? [];

  const quickActions: QuickAction[] = [
    {
      label: "View Work Orders",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
      onClick: () => router.push("/work-orders"),
      variant: "primary",
    },
    {
      label: "Scan QR Code",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>,
      onClick: () => router.push("/scan"),
    },
    {
      label: "Update Availability",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      onClick: () => router.push("/profile"),
    },
    {
      label: "View Dashboard",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>,
      onClick: () => router.push("/home"),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold font-heading ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
            Welcome back, {user.companyName || user.firstName || "Mechanic"}!
          </h2>
          <p className={mode === 'dark' ? "text-gray-300" : "text-gray-600"}>Here's your work summary</p>
        </div>
        <QuickActions actions={quickActions} />
      </div>

      {/* Fleet Dashboard shortcut — shown when mechanic is assigned to one or more fleets */}
      {fleets.length > 0 && (
        <div
          className="flex items-center justify-between gap-4 rounded-2xl px-5 py-4 cursor-pointer"
          style={{ background: "linear-gradient(135deg, rgba(14,165,233,0.15) 0%, rgba(56,189,248,0.08) 100%)", border: "1px solid rgba(14,165,233,0.25)" }}
          onClick={() => router.push("/fleet")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(14,165,233,0.2)" }}>
              <svg className="w-5 h-5 text-captain-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className={`text-sm font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
                {fleets.length === 1 ? fleets[0].name : `${fleets.length} Assigned Fleets`}
              </p>
              <p className={`text-xs ${mode === 'dark' ? "text-captain-300/70" : "text-captain-600"}`}>
                {fleets.reduce((s, f) => s + f.vesselCount, 0)} vessels · View fleet dashboard
              </p>
            </div>
          </div>
          <svg className="w-5 h-5 text-captain-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}

      {/* Stats */}
      <StatsCard title="Your Stats" stats={stats} />

      {/* Announcements */}
      <AnnouncementsFeed maxItems={3} />

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Feed */}
        <SectionCard title="Recent Activity">
          <ActivityFeed maxItems={8} />
        </SectionCard>

        {/* Help Guides */}
        <SectionCard title="Help & Guides">
          <HelpGuides maxItems={4} />
        </SectionCard>
      </div>
    </div>
  );
}

// ============================================
// ADMIN LANDING PAGE
// ============================================

function AdminLandingPage({
  user,
  onViewDashboard,
}: {
  user: any;
  onViewDashboard: () => void;
}) {
  const router = useRouter();
  const stats = useQuery(api.users.getAdminStats);
  const { mode } = useTheme();

  const adminStats: StatItem[] = [
    {
      label: "Total Users",
      value: stats?.totalUsers || 0,
      icon: <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
      color: "bg-blue-500",
      onClick: () => router.push("/admin?tab=waitlist"),
    },
    {
      label: "Total Vessels",
      value: stats?.totalVessels || 0,
      icon: <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>,
      color: "bg-green-500",
      onClick: () => router.push("/admin?tab=overview"),
    },
    {
      label: "Work Orders",
      value: stats?.totalWorkOrders || 0,
      icon: <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
      color: "bg-amber-500",
      onClick: () => router.push("/admin?tab=overview"),
    },
    {
      label: "New This Week",
      value: stats?.newUsersThisWeek || 0,
      icon: <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>,
      color: "bg-purple-500",
      onClick: () => router.push("/admin?tab=waitlist"),
    },
  ];

  const quickActions: QuickAction[] = [
    {
      label: "Create Announcement",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>,
      onClick: () => router.push("/admin?tab=announcements"),
      variant: "primary",
    },
    {
      label: "View Dashboard",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>,
      onClick: () => router.push("/admin?tab=overview"),
    },
    {
      label: "System Settings",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      onClick: () => router.push("/admin?tab=settings"),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold font-heading ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
            Admin Dashboard
          </h2>
          <p className={mode === 'dark' ? "text-gray-300" : "text-gray-600"}>System overview and management</p>
        </div>
        <QuickActions actions={quickActions} />
      </div>

      {/* Stats */}
      <StatsCard title="System Overview" stats={adminStats} />

      {/* Announcements */}
      <AnnouncementsFeed maxItems={3} />

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Feed */}
        <SectionCard title="Recent Activity">
          <ActivityFeed maxItems={10} />
        </SectionCard>

        {/* Help Guides */}
        <SectionCard title="Help & Documentation">
          <HelpGuides maxItems={4} />
        </SectionCard>
      </div>
    </div>
  );
}

// ============================================
// MAIN LANDING PAGE COMPONENT
// ============================================

export function LandingPage() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const user = useQuery(api.users.currentUser);
  const profilePhotoUrl = useQuery(api.storage.getUserProfilePhotoUrl, {});
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const { mode, toggleTheme } = useTheme();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className={`h-8 w-8 animate-spin rounded-full border-4 ${mode === 'dark' ? "border-white/10 border-t-blue-500" : "border-gray-200 border-t-blue-600"}`}></div>
      </div>
    );
  }

  const handleViewDashboard = () => {
    if (user?.role === "mechanic") {
      router.push("/work-orders");
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("qr-captain-prefer-dashboard", "true");
    }
    router.push("/?dashboard=true");
  };

  const handleViewMechanics = () => {
    router.push("/mechanics");
  };

  const handleProfileClick = () => {
    setShowProfile(true);
  };

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-xl ${mode === 'dark' ? "bg-black/20 border-white/10" : "bg-white/80 border-gray-200"}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <a href="/home" className="flex items-center gap-2">
            <img src="/qr-captain-logo.png" alt="QR Captain" className={`h-8 w-8 ${mode === 'dark' ? '' : 'brightness-0'}`} />
            <span className={`text-2xl font-bold font-heading ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>QR Captain</span>
          </a>
          <div className="flex items-center gap-4">
            <HelpButton />
            <div className="relative">
              <NotificationBell onClick={() => setShowNotifications(!showNotifications)} />
              <NotificationsPanel 
                isOpen={showNotifications} 
                onClose={() => setShowNotifications(false)}
                onViewRequest={() => router.push("/?dashboard=true")}
                onViewQuote={(workOrderId) => router.push(`/?dashboard=true&viewQuote=${workOrderId}`)}
                onViewWorkOrder={(workOrderId) => router.push(`/?dashboard=true&viewWorkOrder=${workOrderId}`)}
                onRespondToRequest={(workOrderId) => router.push(`/?dashboard=true&respondToRequest=${workOrderId}`)}
                onViewVessel={() => router.push("/?dashboard=true")}
                onLeaveRating={(workOrderId) => router.push(`/?dashboard=true&viewRating=${workOrderId}`)}
                onViewAnnouncement={() => {
                  setShowNotifications(false);
                  // User is already on the home screen — scroll to top where announcements are visible
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onViewMessage={() => {
                  setShowNotifications(false);
                  router.push("/?dashboard=true");
                }}
                onViewPreferredOwner={() => {
                  setShowNotifications(false);
                  router.push("/?dashboard=true");
                }}
              />
            </div>
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              data-testid="theme-toggle"
              aria-label={mode === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
              title={mode === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
              className={`p-2 rounded-lg transition-colors ${
                mode === 'dark'
                  ? "text-gray-300 hover:text-yellow-400 hover:bg-white/10"
                  : "text-gray-600 hover:text-captain-600 hover:bg-captain-50"
              }`}
            >
              {mode === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <ProfileDropdown
              user={user}
              profilePhotoUrl={profilePhotoUrl || null}
              onProfileClick={handleProfileClick}
              onSignOut={() => signOut()}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {user.role === "owner" && (
          <div className={mode === 'dark' ? "text-white" : "text-gray-900"}>
            <OwnerLandingPage 
              user={user} 
              onViewDashboard={handleViewDashboard}
              onViewMechanics={handleViewMechanics}
            />
          </div>
        )}
        {user.role === "fleet_manager" && (
          <div className={mode === 'dark' ? "text-white" : "text-gray-900"}>
            <FleetManagerRedirect onboardingCompleted={(user as any).onboardingCompleted} />
          </div>
        )}
        {user.role === "mechanic" && (
          <div className={mode === 'dark' ? "text-white" : "text-gray-900"}>
            <MechanicLandingPage
              user={user}
              onViewDashboard={handleViewDashboard}
            />
          </div>
        )}
        {user.role === "admin" && (
          <div className={mode === 'dark' ? "text-white" : "text-gray-900"}>
            <AdminLandingPage 
              user={user} 
              onViewDashboard={handleViewDashboard}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`border-t py-6 mt-8 ${mode === 'dark' ? "bg-black/20 border-white/10 text-gray-400" : "bg-white border-gray-200 text-gray-500"}`}>
        <div className="mx-auto max-w-7xl px-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} QR Captain. All rights reserved.</p>
        </div>
      </footer>

      {/* Profile Modal - Role-specific */}
      {showProfile && (user.role === "owner" || user.role === "fleet_manager") && (
        <OwnerProfile onClose={() => setShowProfile(false)} />
      )}
      {showProfile && user.role === "mechanic" && (
        <MechanicProfile onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}
