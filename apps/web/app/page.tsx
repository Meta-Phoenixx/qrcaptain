"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Dashboard } from "@/components/dashboard";

function AuthenticatedContent() {
  const router = useRouter();
  const user = useQuery(api.users.currentUser);

  // Read URL params synchronously in the state initializer to avoid race conditions.
  // If we used useEffect to set this, the redirect effect could fire first
  // (seeing fromHome=false) and push back to /home before the state update.
  const [fromHome] = useState(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get("dashboard") === "true" || document.referrer.includes("/home");
    }
    return false;
  });

  // If user hasn't explicitly chosen to view dashboard, redirect to home
  useEffect(() => {
    if (user && !fromHome) {
      const preferDashboard = localStorage.getItem("qr-captain-prefer-dashboard");
      if (!preferDashboard) {
        router.push("/home");
      }
    }
  }, [user, fromHome, router]);

  // User data still loading
  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-captain-200 border-t-captain-600"></div>
      </div>
    );
  }

  return <Dashboard />;
}

export default function Home() {
  return (
    <main className="min-h-screen">
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
        </div>
      </AuthLoading>
      
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-bold font-heading mb-2 flex items-center justify-center gap-2">
                <img src="/qr-captain-logo.png" alt="QR Captain" className="h-10 w-10 brightness-0" />
                QR Captain
              </h1>
              <p className="text-lg opacity-80">
                Complete vessel maintenance tracking
              </p>
            </div>
            <SignInForm />
          </div>
        </div>
      </Unauthenticated>
      
      <Authenticated>
        <AuthenticatedContent />
      </Authenticated>
    </main>
  );
}
