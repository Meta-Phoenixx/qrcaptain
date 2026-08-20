"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSideNav } from "@/components/app-side-nav";

// Map raw error messages/names to plain-English explanations the team can act on.
function translateError(error: Error): { title: string; explanation: string; suggestion: string } {
  const msg = (error?.message ?? "").toLowerCase();
  const name = (error?.name ?? "").toLowerCase();

  if (msg.includes("useaction") || msg.includes("usemutation") || msg.includes("convex hook")) {
    return {
      title: "Real-time connection error",
      explanation: "A Convex function was called with the wrong hook type (action vs. mutation). This is a code bug, not a user error.",
      suggestion: "Check that actions use useAction() and mutations use useMutation() in the relevant component.",
    };
  }

  if (msg.includes("not found") || msg.includes("404") || name.includes("notfound")) {
    return {
      title: "Resource not found",
      explanation: "The page tried to load something that doesn't exist — a vessel, work order, or other record may have been deleted.",
      suggestion: "Go back and try again. If the problem persists, the record may have been removed.",
    };
  }

  if (msg.includes("permission") || msg.includes("access denied") || msg.includes("unauthorized") || msg.includes("403")) {
    return {
      title: "Access denied",
      explanation: "You don't have permission to view this resource. Your role may not include access to this vessel or feature.",
      suggestion: "Ask the vessel owner to grant you access, or contact an admin.",
    };
  }

  if (msg.includes("network") || msg.includes("failed to fetch") || msg.includes("connection refused")) {
    return {
      title: "Network error",
      explanation: "The app couldn't reach the QR Captain servers. This is usually a temporary connection issue.",
      suggestion: "Check your internet connection and try refreshing.",
    };
  }

  if (msg.includes("convex") || msg.includes("query") || msg.includes("mutation")) {
    return {
      title: "Database error",
      explanation: "A request to the QR Captain database failed. This may be a temporary issue or a schema mismatch.",
      suggestion: "Refresh and try again. If it keeps happening, check the Convex dashboard for deployment errors.",
    };
  }

  if (msg.includes("chunk") || msg.includes("loading chunk") || msg.includes("module")) {
    return {
      title: "Page load error",
      explanation: "A piece of the app failed to load, usually after a new deployment. This resolves itself on refresh.",
      suggestion: "Hard refresh the page (Cmd+Shift+R / Ctrl+Shift+R).",
    };
  }

  if (msg.includes("hydration") || msg.includes("text content")) {
    return {
      title: "Rendering mismatch",
      explanation: "The server and client rendered different content. This is a code bug, usually in a component that reads browser-only state on first render.",
      suggestion: "Hard refresh. If it persists, check for useEffect / localStorage reads that run server-side.",
    };
  }

  return {
    title: "Unexpected error",
    explanation: error?.message || "An unknown error occurred.",
    suggestion: "Try refreshing. If this keeps happening, copy the error details below and share them with the team.",
  };
}

export default function TabsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[QR Captain error boundary]", error);
  }, [error]);

  const router = useRouter();
  const { title, explanation, suggestion } = translateError(error);

  return (
    <div className="flex min-h-screen bg-[#0f1929]">
      <AppSideNav />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          {/* Icon */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-white font-heading font-bold text-xl">{title}</h1>
              <p className="text-white/40 text-xs mt-0.5">Something went wrong on this page</p>
            </div>
          </div>

          {/* Explanation card */}
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 space-y-4 mb-6">
            <div>
              <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1.5">What happened</p>
              <p className="text-white/90 text-sm leading-relaxed">{explanation}</p>
            </div>
            <div className="border-t border-white/[0.06] pt-4">
              <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1.5">What to do</p>
              <p className="text-white/70 text-sm leading-relaxed">{suggestion}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => { router.refresh(); reset(); }}
              className="flex-1 py-2.5 rounded-xl bg-captain-500 hover:bg-captain-600 text-white text-sm font-semibold transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => router.back()}
              className="flex-1 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/70 text-sm font-medium transition-colors border border-white/[0.08]"
            >
              Go Back
            </button>
          </div>

          {/* Debug details (collapsed) */}
          <details className="group">
            <summary className="text-white/30 text-xs cursor-pointer hover:text-white/50 transition-colors select-none">
              Error details (for developers)
            </summary>
            <div className="mt-3 bg-black/30 rounded-xl p-4 font-mono text-xs text-white/50 overflow-x-auto">
              <p className="text-white/40 mb-1">Name: <span className="text-white/60">{error?.name}</span></p>
              <p className="text-white/40 mb-1">Message: <span className="text-white/60">{error?.message}</span></p>
              {error?.digest && (
                <p className="text-white/40 mb-1">Digest: <span className="text-white/60">{error.digest}</span></p>
              )}
              {error?.stack && (
                <pre className="mt-2 text-white/30 whitespace-pre-wrap break-all text-[10px]">{error.stack}</pre>
              )}
            </div>
          </details>
        </div>
      </main>
    </div>
  );
}
