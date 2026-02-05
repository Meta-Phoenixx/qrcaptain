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
  const [fromHome, setFromHome] = useState(false);

  // Check if user came from /home (indicated by URL param or referrer)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const fromHomeParam = urlParams.get("dashboard");
      setFromHome(fromHomeParam === "true" || document.referrer.includes("/home"));
    }
  }, []);

  // User data still loading
  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-captain-200 border-t-captain-600"></div>
      </div>
    );
  }

  // If user hasn't explicitly chosen to view dashboard, redirect to home
  // Check if they're coming from the home page (they clicked "View Dashboard")
  // or if they have the dashboard param
  useEffect(() => {
    if (user && !fromHome) {
      // Check localStorage to see if user prefers to go directly to dashboard
      const preferDashboard = localStorage.getItem("qr-captain-prefer-dashboard");
      if (!preferDashboard) {
        router.push("/home");
      }
    }
  }, [user, fromHome, router]);

  return <Dashboard />;
}

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-captain-50 to-captain-100">
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-captain-200 border-t-captain-600"></div>
        </div>
      </AuthLoading>
      
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-bold text-captain-900">
                ⚓ QR Captain
              </h1>
              <p className="mt-2 text-captain-600">
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
