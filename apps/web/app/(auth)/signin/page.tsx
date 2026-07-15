"use client";

import { Authenticated } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SignInPageContent } from "@/components/sign-in-page-content";

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
