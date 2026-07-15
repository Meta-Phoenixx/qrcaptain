"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/components/providers/theme-provider";

export interface ProfileDropdownProps {
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

export function ProfileDropdown({
  user,
  profilePhotoUrl,
  onProfileClick,
  onSignOut,
}: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { mode } = useTheme();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName =
    user.firstName && user.lastName
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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {profilePhotoUrl ? (
          <img
            src={profilePhotoUrl}
            alt={displayName}
            className={`w-10 h-10 rounded-full object-cover border-2 transition-colors ${
              mode === "dark"
                ? "border-blue-500/30 hover:border-blue-500"
                : "border-blue-200 hover:border-blue-400"
            }`}
          />
        ) : (
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm border-2 transition-colors ${
              mode === "dark"
                ? "bg-blue-600 text-white border-blue-400"
                : "bg-blue-100 text-blue-700 border-blue-200"
            }`}
          >
            {initials}
          </div>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-64 py-2 z-50 rounded-2xl border backdrop-blur-xl overflow-hidden ${
            mode === "dark"
              ? "bg-gray-900/95 border-white/10 shadow-[0_4px_24px_-1px_rgba(0,0,0,0.4)]"
              : "bg-white/95 border-gray-200 shadow-[0_4px_24px_-1px_rgba(0,0,0,0.12)]"
          }`}
        >
          <div
            className={`px-4 py-3 border-b ${
              mode === "dark" ? "border-white/10" : "border-gray-100"
            }`}
          >
            <p
              className={`text-sm font-semibold truncate ${
                mode === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              {displayName}
            </p>
            <p
              className={`text-xs truncate ${
                mode === "dark" ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {user.email}
            </p>
            <span
              className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                mode === "dark"
                  ? "bg-blue-500/20 text-blue-300"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {user.role}
            </span>
          </div>

          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                onProfileClick();
              }}
              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors ${
                mode === "dark"
                  ? "text-gray-300 hover:bg-white/10"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              My Profile
            </button>
          </div>

          <div
            className={`border-t pt-1 ${
              mode === "dark" ? "border-white/10" : "border-gray-100"
            }`}
          >
            <button
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors ${
                mode === "dark"
                  ? "text-red-400 hover:bg-red-500/10"
                  : "text-red-600 hover:bg-red-50"
              }`}
            >
              <svg
                className="w-5 h-5 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
