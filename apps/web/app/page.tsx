"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Dashboard } from "@/components/dashboard";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-captain-50 to-captain-100">
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
        <Dashboard />
      </Authenticated>
    </main>
  );
}
