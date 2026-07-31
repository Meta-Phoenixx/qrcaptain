"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@convex/_generated/api";
import { Dashboard } from "@/components/dashboard";
import { PublicLandingPage } from "@/components/public/public-landing-page";

// Maximum time (ms) to wait for auth state before showing sign-in as fallback.
// This prevents an infinite loading spinner when the Convex WebSocket connection
// is slow (e.g. through a tunnel/proxy) or fails to establish.
const AUTH_LOADING_TIMEOUT_MS = 8000;

function AuthenticatedContent() {
  const router = useRouter();
  const user = useQuery(api.users.currentUser);

  useEffect(() => {
    if (!user) return;
    if (user.role === "owner") {
      router.replace("/my-vessels");
    } else if (user.role === "mechanic") {
      router.replace("/fleet");
    } else if (user.role === "admin") {
      router.replace("/admin");
    } else if (user.role === "fleet_manager") {
      router.replace("/fleet");
    } else {
      router.replace("/home");
    }
  }, [user, router]);

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1929]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-captain-400" />
      </div>
    );
  }

  // Render nothing while redirect fires
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1929]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-captain-400" />
    </div>
  );
}

/**
 * Auth loading state with a timeout fallback.
 * If auth hasn't resolved within AUTH_LOADING_TIMEOUT_MS, we show the sign-in
 * form instead of an infinite spinner. Once auth resolves (if the connection
 * eventually succeeds), the Authenticated/Unauthenticated wrappers take over.
 */
function AuthLoadingWithTimeout() {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), AUTH_LOADING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  if (timedOut) {
    // Show landing page as fallback — if auth eventually resolves the
    // Authenticated/Unauthenticated wrappers will replace this content
    return <PublicLandingPage />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen">
      <AuthLoading>
        <AuthLoadingWithTimeout />
      </AuthLoading>
      
      <Unauthenticated>
        <PublicLandingPage />
      </Unauthenticated>
      
      <Authenticated>
        <AuthenticatedContent />
      </Authenticated>
    </main>
  );
}
