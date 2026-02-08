"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { MechanicDirectory } from "@/components/mechanic-directory";
import { useTheme } from "@/components/providers/theme-provider";
import Link from "next/link";

export default function MechanicsPage() {
  const { mode } = useTheme();

  return (
    <main className={`min-h-screen ${mode === 'dark' ? "bg-[#0F0F17]" : "bg-gradient-to-br from-captain-50 to-captain-100"}`}>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-captain-200 border-t-captain-600"></div>
        </div>
      </AuthLoading>
      
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="text-center">
            <h1 className={`text-2xl font-bold mb-4 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Please Sign In</h1>
            <p className={`mb-6 ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>You need to be signed in to view the mechanic directory.</p>
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
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link 
                href="/"
                className={`p-2 rounded-lg transition-colors ${mode === 'dark' ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-600 hover:text-gray-900 hover:bg-white"}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className={`text-3xl font-bold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Mechanic Directory</h1>
                <p className={mode === 'dark' ? "text-gray-400" : "text-gray-600"}>Find and connect with certified marine mechanics</p>
              </div>
            </div>
          </div>
          
          {/* Directory Component */}
          <MechanicDirectory />
        </div>
      </Authenticated>
    </main>
  );
}
