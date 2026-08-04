"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useRouter } from "next/navigation";

export function ImpersonationBanner() {
  const a = api as any;
  const me = useQuery(api.users.currentUser);
  const stopImpersonation = useMutation(a.admin.stopImpersonation);
  const router = useRouter();

  if (!me || !(me as any)._impersonating) return null;

  const name = `${me.firstName ?? ""} ${me.lastName ?? ""}`.trim() || me.email || "User";
  const role = me.role ?? "unknown";

  async function handleExit() {
    await stopImpersonation({});
    router.replace("/admin");
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-[9999] flex items-center justify-between gap-4 px-5 py-2.5 bg-red-600 text-white text-sm font-medium shadow-lg">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span>
          Admin Impersonation Active — viewing as{" "}
          <span className="font-bold">{name}</span>{" "}
          <span className="opacity-75">({role})</span>
        </span>
      </div>
      <button
        onClick={handleExit}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-xs font-semibold"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Exit Impersonation
      </button>
    </div>
  );
}
