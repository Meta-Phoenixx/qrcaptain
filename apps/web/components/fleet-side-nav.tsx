"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

const NAV_ITEMS = [
  { label: "Command Center", href: "/fleet",       icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
  )},
  { label: "Vessels",         href: "/vessels",    icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>
  )},
  { label: "Work Orders",     href: "/work-orders", icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
  )},
  { label: "Maintenance",     href: "/maintenance", icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  )},
  { label: "Calendar",        href: "/calendar",   icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  )},
  { label: "Parts & Inventory", href: "/parts",   icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
  )},
  { label: "Reports",         href: "/reports",    icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
  )},
  { label: "Documents",       href: "/documents",  icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
  )},
  { label: "Alerts",          href: "/alerts",     icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
  )},
];

export function FleetSideNav({
  selectedFleetId,
  fleets,
  onFleetChange,
}: {
  selectedFleetId: Id<"fleets"> | null;
  fleets: Array<{ _id: Id<"fleets">; name: string; vesselCount: number }>;
  onFleetChange: (id: Id<"fleets">) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [fleetOpen, setFleetOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { signOut } = useAuthActions();
  const a = api as any;
  const me = useQuery(a.users.currentUser);

  // Close profile popover on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileOpen]);

  const selectedFleet = fleets.find((f) => f._id === selectedFleetId);
  const initials = me ? `${me.firstName?.[0] ?? ""}${me.lastName?.[0] ?? ""}`.toUpperCase() : "?";

  return (
    <aside className="hidden lg:flex flex-col w-56 xl:w-60 flex-shrink-0 min-h-screen bg-[#0d1526] border-r border-white/[0.06]">
      {/* Logo */}
      <button onClick={() => router.push("/home")} className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors text-left w-full">
        <div className="w-9 h-9 rounded-xl bg-captain-500/20 border border-captain-500/30 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-captain-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest leading-none">THE</p>
          <p className="text-sm font-bold text-white leading-tight font-heading">QR CAPTAIN</p>
        </div>
      </button>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/fleet" && item.href !== "/vessels" && pathname.startsWith(item.href));
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left
                ${active
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

      {/* Fleet selector */}
      <div className="px-3 pb-3 border-t border-white/[0.06] pt-3">
        <p className="text-[10px] uppercase tracking-widest text-white/30 font-medium px-2 mb-2">Fleet</p>
        <div className="relative">
          <button
            onClick={() => setFleetOpen((o) => !o)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-captain-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-captain-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{selectedFleet?.name ?? "Select Fleet"}</p>
              <p className="text-[10px] text-white/35">{selectedFleet?.vesselCount ?? 0} Vessels</p>
            </div>
            <svg className="w-3.5 h-3.5 text-white/30 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {fleetOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl bg-[#1a2540] border border-white/[0.1] shadow-xl overflow-hidden z-50">
              {fleets.map((f) => (
                <button
                  key={f._id}
                  onClick={() => { onFleetChange(f._id); setFleetOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-white/[0.06] transition-colors text-left ${selectedFleetId === f._id ? "text-captain-400" : "text-white/70"}`}
                >
                  <span className="truncate">{f.name}</span>
                  <span className="text-xs text-white/30 ml-2 flex-shrink-0">{f.vesselCount}v</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

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
          {/* Profile popover */}
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

          {/* Profile button */}
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
                {me ? `${me.firstName ?? ""} ${me.lastName ?? ""}`.trim() : "Loading…"}
              </p>
              <p className="text-[10px] text-white/35 capitalize">{me?.role?.replace("_", " ") ?? ""}</p>
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
