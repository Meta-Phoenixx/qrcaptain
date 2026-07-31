"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";

const NAV_ITEMS = [
  {
    label: "My Vessels",
    href: "/my-vessels",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3l14 9-14 9V3z" />
      </svg>
    ),
  },
  {
    label: "Work Orders",
    href: "/my-work-orders",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    label: "Mechanics",
    href: "/mechanics",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    label: "Alerts",
    href: "/alerts",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
];

export function OwnerSideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { signOut } = useAuthActions();
  const a = api as any;
  const me = useQuery(a.users.currentUser);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileOpen]);

  const initials = me
    ? `${me.firstName?.[0] ?? ""}${me.lastName?.[0] ?? ""}`.toUpperCase()
    : "?";

  return (
    <aside className="hidden lg:flex flex-col w-56 xl:w-60 flex-shrink-0 min-h-screen bg-[#0d1526] border-r border-white/[0.06]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.06]">
        <div className="w-9 h-9 rounded-xl bg-captain-500/20 border border-captain-500/30 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-captain-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest leading-none">THE</p>
          <p className="text-sm font-bold text-white leading-tight font-heading">QR CAPTAIN</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/my-vessels" && pathname.startsWith(item.href));
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left
                ${
                  active
                    ? "bg-captain-500/15 text-captain-300 border border-captain-500/20"
                    : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                }`}
            >
              <span className={active ? "text-captain-400" : "text-white/35"}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Support + User */}
      <div className="px-3 pb-4 space-y-1 border-t border-white/[0.06] pt-3">
        <button
          onClick={() => router.push("/help")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors text-sm text-left"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Support
        </button>

        <div className="relative" ref={profileRef}>
          {profileOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-[#1a2540] border border-white/[0.1] shadow-xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-white/[0.08]">
                <p className="text-xs font-semibold text-white truncate">
                  {me ? `${me.firstName ?? ""} ${me.lastName ?? ""}`.trim() : ""}
                </p>
                <p className="text-[10px] text-white/40 truncate">{me?.email ?? ""}</p>
              </div>
              <button
                onClick={() => { router.push("/home"); setProfileOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors text-left"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                View Profile
              </button>
              <button
                onClick={async () => { await signOut(); router.replace("/signin"); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          )}

          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-captain-500/20 border border-captain-500/30 flex items-center justify-center flex-shrink-0">
              {me?.profilePhotoStorageId ? (
                <img src={me.profilePhotoStorageId} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-captain-300">{initials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-xs font-semibold text-white truncate">
                {me ? `${me.firstName ?? ""} ${me.lastName ?? ""}`.trim() || me.name || "Owner" : "Loading…"}
              </p>
              <p className="text-[10px] text-white/35 capitalize">{me?.role ?? "owner"}</p>
            </div>
            <svg className="w-3.5 h-3.5 text-white/20 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
