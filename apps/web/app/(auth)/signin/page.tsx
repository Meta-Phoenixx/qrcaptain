"use client";

import { Authenticated } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { SignInPageContent } from "@/components/sign-in-page-content";

function RedirectIfAuthenticated() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  useEffect(() => {
    router.replace(redirect || "/home");
  }, [router, redirect]);
  return null;
}

export default function SignInPage() {
  return (
    <main className="min-h-screen">
      <Authenticated>
        <Suspense>
          <RedirectIfAuthenticated />
        </Suspense>
      </Authenticated>
      <SignInPageContent />
    </main>
  );
}
