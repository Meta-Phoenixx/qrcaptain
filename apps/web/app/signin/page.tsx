"use client";

import { Authenticated } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SignInPageContent } from "../page";

/**
 * Dedicated sign-in page at /signin.
 * This provides a direct, bookmarkable URL for the sign-in form that doesn't
 * depend on the Convex auth loading state resolving first.
 * 
 * If the user is already authenticated, they'll be redirected to /home.
 */
function RedirectIfAuthenticated() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/home");
  }, [router]);
  return null;
}

export default function SignInPage() {
  return (
    <main className="min-h-screen">
      <Authenticated>
        <RedirectIfAuthenticated />
      </Authenticated>
      <SignInPageContent />
    </main>
  );
}
