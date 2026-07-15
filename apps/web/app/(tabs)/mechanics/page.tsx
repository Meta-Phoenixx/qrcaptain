"use client";

import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@convex/_generated/api";
import { MechanicDirectory } from "@/components/mechanic-directory";
import { MechanicProfile } from "@/components/mechanic-profile";
import { OwnerProfile } from "@/components/owner-profile";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import { useTheme } from "@/components/providers/theme-provider";
import Link from "next/link";
import { useState } from "react";

function MechanicsPageContent() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);
  const profilePhotoUrl = useQuery(api.storage.getUserProfilePhotoUrl, {});
  const [showProfile, setShowProfile] = useState(false);
  const { mode, toggleTheme } = useTheme();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          className={`h-8 w-8 animate-spin rounded-full border-4 ${
            mode === "dark"
              ? "border-white/10 border-t-blue-500"
              : "border-gray-200 border-t-blue-600"
          }`}
        />
      </div>
    );
  }

  return (
    <>
      <header
        className={`sticky top-0 z-50 border-b backdrop-blur-xl ${
          mode === "dark"
            ? "bg-black/20 border-white/10"
            : "bg-white/80 border-gray-200"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/home"
              className={`p-2 rounded-lg transition-colors ${
                mode === "dark"
                  ? "text-gray-400 hover:text-white hover:bg-white/10"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1
                className={`text-xl font-bold font-heading ${
                  mode === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                Mechanic Directory
              </h1>
              <p className={`text-sm ${mode === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Find and connect with certified marine mechanics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className={`p-2 rounded-lg transition-colors ${
                mode === "dark"
                  ? "text-gray-300 hover:text-yellow-400 hover:bg-white/10"
                  : "text-gray-600 hover:text-captain-600 hover:bg-captain-50"
              }`}
            >
              {mode === "dark" ? (
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
              profilePhotoUrl={profilePhotoUrl ?? null}
              onProfileClick={() => setShowProfile(true)}
              onSignOut={() => signOut()}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <MechanicDirectory />
      </main>

      {showProfile && user.role === "owner" && (
        <OwnerProfile onClose={() => setShowProfile(false)} />
      )}
      {showProfile && user.role === "mechanic" && (
        <MechanicProfile onClose={() => setShowProfile(false)} />
      )}
    </>
  );
}

export default function MechanicsPage() {
  const { mode } = useTheme();
  return (
    <main
      className={`min-h-screen ${
        mode === "dark"
          ? "bg-[#0F0F17]"
          : "bg-gradient-to-br from-captain-50 to-captain-100"
      }`}
    >
      <MechanicsPageContent />
    </main>
  );
}
