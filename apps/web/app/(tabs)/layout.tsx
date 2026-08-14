"use client";

import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { api } from "../../../../convex/_generated/api";

function FleetManagerOnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const me = useQuery((api as any).users.currentUser);

  const needsOnboarding =
    me !== undefined &&
    me?.role === "fleet_manager" &&
    (!me?.onboardingCompleted || !me?.companyName);

  useEffect(() => {
    if (needsOnboarding) router.replace("/onboarding/fleet-manager");
  }, [needsOnboarding, router]);

  if (me === undefined) return <>{children}</>;
  if (needsOnboarding) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#080f1a]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-captain-200 border-t-captain-600" />
      </div>
    );
  }
  return <>{children}</>;
}

function UnauthRedirect() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Brief settling delay: after a fresh signIn(), router.push("/home") causes
    // this layout to mount before the ConvexAuthProvider has propagated the new
    // token. Without the delay, <Unauthenticated> fires immediately and sends the
    // user back to /signin before auth state is confirmed.
    const t = setTimeout(() => setReady(true), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready) router.replace("/signin");
  }, [ready, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-captain-200 border-t-captain-600" />
    </div>
  );
}

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-captain-200 border-t-captain-600" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <UnauthRedirect />
      </Unauthenticated>
      <Authenticated>
        <ImpersonationBanner />
        <FleetManagerOnboardingGate>
          {children}
        </FleetManagerOnboardingGate>
      </Authenticated>
    </>
  );
}
