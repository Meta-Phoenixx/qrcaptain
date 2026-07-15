"use client";

import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@convex/_generated/api";
import { HelpCenter } from "@/components/help-center";
import { MechanicProfile } from "@/components/mechanic-profile";
import { OwnerProfile } from "@/components/owner-profile";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import { useTheme } from "@/components/providers/theme-provider";
import { useState } from "react";

function HelpPageContent() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);
  const profilePhotoUrl = useQuery(api.storage.getUserProfilePhotoUrl, {});
  const [showProfile, setShowProfile] = useState(false);
  const { mode } = useTheme();

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
      <div className="fixed top-3 right-4 z-[60] flex items-center gap-3">
        <ProfileDropdown
          user={user}
          profilePhotoUrl={profilePhotoUrl ?? null}
          onProfileClick={() => setShowProfile(true)}
          onSignOut={() => signOut()}
        />
      </div>

      <HelpCenter />

      {showProfile && user.role === "owner" && (
        <OwnerProfile onClose={() => setShowProfile(false)} />
      )}
      {showProfile && user.role === "mechanic" && (
        <MechanicProfile onClose={() => setShowProfile(false)} />
      )}
    </>
  );
}

export default function HelpPage() {
  const { mode } = useTheme();
  return (
    <main
      className={`min-h-screen ${
        mode === "dark"
          ? "bg-[#0F0F17]"
          : "bg-gradient-to-br from-captain-50 to-captain-100"
      }`}
    >
      <HelpPageContent />
    </main>
  );
}
