"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient, useConvexAuth } from "convex/react";
import { ReactNode, useEffect } from "react";
import { ThemeProvider } from "../components/providers/theme-provider";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Syncs auth state to a lightweight cookie so server-side middleware can
// gate routes without needing full JWT cookie support.
function SessionCookieSync() {
  const { isAuthenticated } = useConvexAuth();
  useEffect(() => {
    if (isAuthenticated) {
      document.cookie = "__auth=1; path=/; SameSite=Lax";
    } else {
      document.cookie =
        "__auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    }
  }, [isAuthenticated]);
  return null;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthProvider client={convex}>
      <SessionCookieSync />
      <ThemeProvider>{children}</ThemeProvider>
    </ConvexAuthProvider>
  );
}
