"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSideNav } from "@/components/app-side-nav";

function translateError(error: Error): { title: string; explanation: string; suggestion: string } {
  const msg = (error?.message ?? "").toLowerCase();

  if (msg.includes("is not a function") || msg.includes("cannot read") || msg.includes("undefined")) {
    return {
      title: "Data rendering error",
      explanation: `A vessel field contained unexpected data: "${error.message}". This is a code bug triggered by this vessel's specific data.`,
      suggestion: "Share this error with the team — include the vessel ID from the URL. Try visiting a different vessel in the meantime.",
    };
  }
  if (msg.includes("useaction") || msg.includes("convex")) {
    return {
      title: "Convex connection error",
      explanation: `A real-time database call failed: "${error.message}".`,
      suggestion: "This may resolve on refresh. If not, check the Convex dashboard for deployment errors.",
    };
  }
  if (msg.includes("not found") || msg.includes("404")) {
    return {
      title: "Vessel not found",
      explanation: "This vessel record may have been deleted or you may not have permission to view it.",
      suggestion: "Go back to your vessels list and try again.",
    };
  }
  return {
    title: "Vessel page error",
    explanation: error?.message || "An unexpected error occurred loading this vessel.",
    suggestion: "Try refreshing. If the error persists, share the details below with the team.",
  };
}

export default function VesselError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[QR Captain vessel error]", error);
  }, [error]);

  const router = useRouter();
  const { title, explanation, suggestion } = translateError(error);

  return (
    <div className="flex min-h-screen bg-[#0f1929]">
      <AppSideNav />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-white font-heading font-bold text-xl">{title}</h1>
              <p className="text-white/40 text-xs mt-0.5">This vessel page encountered an error</p>
            </div>
          </div>

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

          <div className="flex gap-3 mb-6">
            <button
              onClick={reset}
              className="flex-1 py-2.5 rounded-xl bg-captain-500 hover:bg-captain-600 text-white text-sm font-semibold transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push("/my-vessels")}
              className="flex-1 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/70 text-sm font-medium transition-colors border border-white/[0.08]"
            >
              My Vessels
            </button>
          </div>

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
