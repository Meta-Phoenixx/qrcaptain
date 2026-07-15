"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function UnauthRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/signin");
  }, [router]);
  return null;
}

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-captain-200 border-t-captain-600" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <UnauthRedirect />
      </Unauthenticated>
      <Authenticated>{children}</Authenticated>
    </>
  );
}
