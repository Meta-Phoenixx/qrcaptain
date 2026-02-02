"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Dashboard } from "@/components/dashboard";

function AuthenticatedContent() {
  const user = useQuery(api.users.currentUser);

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
