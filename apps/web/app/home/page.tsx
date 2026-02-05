"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LandingPage } from "@/components/landing-page";

function UnauthenticatedRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.push("/");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-captain-200 border-t-captain-600"></div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-captain-50 to-gray-100">
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-captain-200 border-t-captain-600"></div>
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
