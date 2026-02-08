"use client";

import { SignInForm } from "@/components/auth/sign-in-form";

/** Sign-in page content — shared between the root page fallback and /signin route */
export function SignInPageContent() {
  return (
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
  );
}
