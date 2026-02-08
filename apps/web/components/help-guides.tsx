"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useTheme } from "./providers/theme-provider";

// Category icons
const CATEGORY_CONFIG: Record<string, { icon: JSX.Element; color: string; bgColor: string }> = {
  getting_started: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
  vessels: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 17h1l2-4h12l2 4h1M5 17l-2 4h18l-2-4M12 3v10M8 7l4-4 4 4" />
      </svg>
    ),
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  work_orders: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  mechanics: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  equipment: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
  billing: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
  troubleshooting: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
};

interface HelpGuidesProps {
  maxItems?: number;
  showCategories?: boolean;
}

export function HelpGuides({ maxItems = 4, showCategories = true }: HelpGuidesProps) {
  const { mode } = useTheme();
  const guides = useQuery(api.helpGuides.getGuidesByRole, {});

  if (!guides) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-16 rounded-lg ${mode === 'dark' ? "bg-white/5" : "bg-gray-100"}`} />
        ))}
      </div>
    );
  }

  if (guides.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className={`w-12 h-12 mx-auto mb-3 ${mode === 'dark' ? "text-gray-600" : "text-gray-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <p className={mode === 'dark' ? "text-gray-500" : "text-gray-400"}>No help guides available</p>
      </div>
    );
  }

  const displayedGuides = guides.slice(0, maxItems);

  return (
    <div className="space-y-3">
      {displayedGuides.map((guide) => {
        const config = CATEGORY_CONFIG[guide.category];
        return (
          <a
            key={guide._id}
            href="/help"
            className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left block ${
              mode === 'dark'
                ? "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                : "bg-white border-gray-200 hover:border-captain-300 hover:shadow-sm"
            }`}
          >
            <div className={`flex-shrink-0 p-2 rounded-lg ${
              mode === 'dark' 
                ? "bg-white/10 text-white" 
                : (config?.bgColor || "bg-gray-100") + " " + (config?.color || "text-gray-600")
            }`}>
              {config?.icon || (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`font-medium text-sm ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{guide.title}</h4>
              <p className={`text-xs mt-0.5 line-clamp-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{guide.summary}</p>
            </div>
            <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        );
      })}

      {/* Link to full Help Center */}
      <a
        href="/help"
        className={`w-full py-2 text-sm font-medium flex items-center justify-center gap-1.5 ${mode === 'dark' ? "text-blue-400 hover:text-blue-300" : "text-captain-600 hover:text-captain-700"}`}
      >
        View all guides in Help Center
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </a>
    </div>
  );
}

// Compact help button for quick access - navigates to /help page
export function HelpButton() {
  const { mode } = useTheme();

  return (
    <a
      href="/help"
      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
        mode === 'dark' 
          ? "text-gray-300 hover:text-white hover:bg-white/10" 
          : "text-gray-600 hover:text-captain-600 hover:bg-captain-50"
      }`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Help
    </a>
  );
}
