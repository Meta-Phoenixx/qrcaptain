"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LandingPage } from "@/components/landing-page";
import { useTheme } from "@/components/providers/theme-provider";

function UnauthenticatedRedirect() {
  const router = useRouter();
  const { mode } = useTheme();
  
  useEffect(() => {
    router.push("/");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className={`h-8 w-8 animate-spin rounded-full border-4 ${mode === 'dark' ? "border-blue-400 border-t-transparent" : "border-captain-200 border-t-captain-600"}`}></div>
    </div>
  );
}

export default function HomePage() {
  const { mode } = useTheme();
  
  return (
    <main className="min-h-screen bg-transparent">
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <div className={`h-8 w-8 animate-spin rounded-full border-4 ${mode === 'dark' ? "border-blue-400 border-t-transparent" : "border-captain-200 border-t-captain-600"}`}></div>
        </div>
      </AuthLoading>
      
      <Unauthenticated>
        <UnauthenticatedRedirect />
      </Unauthenticated>
      
      <Authenticated>
        <LandingPage />
      </Authenticated>
    </main>
  );
}
