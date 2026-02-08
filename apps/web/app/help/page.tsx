"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { HelpCenter } from "@/components/help-center";
import { useTheme } from "@/components/providers/theme-provider";
import Link from "next/link";

export default function HelpPage() {
  const { mode } = useTheme();

  return (
    <main className={`min-h-screen ${mode === 'dark' ? "bg-[#0F0F17]" : "bg-gradient-to-br from-captain-50 to-captain-100"}`}>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <div className={`h-8 w-8 animate-spin rounded-full border-4 ${mode === 'dark' ? "border-blue-400 border-t-transparent" : "border-captain-200 border-t-captain-600"}`}></div>
        </div>
      </AuthLoading>
      
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="text-center">
            <h1 className={`text-2xl font-bold mb-4 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Please Sign In</h1>
            <p className={`mb-6 ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>You need to be signed in to view the help center.</p>
            <Link 
              href="/"
              className="px-6 py-3 bg-captain-600 text-white rounded-lg hover:bg-captain-700 transition-colors"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </Unauthenticated>
      
      <Authenticated>
        <HelpCenter />
      </Authenticated>
    </main>
  );
}
