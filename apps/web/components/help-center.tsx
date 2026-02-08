"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState, useMemo, useEffect } from "react";
import { useTheme } from "./providers/theme-provider";
import { GlassCard, GlassInput } from "./ui/glass";
import Link from "next/link";

// ============================================
// CONSTANTS
// ============================================

const CATEGORY_ORDER = [
  "getting_started",
  "vessels",
  "equipment",
  "mechanics",
  "work_orders",
  "billing",
  "troubleshooting",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  getting_started: "Getting Started",
  vessels: "Vessels",
  equipment: "Equipment & Maintenance",
  mechanics: "Mechanics",
  work_orders: "Work Orders",
  billing: "Ratings & Communication",
  troubleshooting: "Troubleshooting",
};

const MECHANIC_CATEGORY_LABELS: Record<string, string> = {
  getting_started: "Getting Started",
  vessels: "Vessel Access",
  equipment: "Equipment",
  mechanics: "Availability & Profile",
  work_orders: "Work Orders",
  billing: "Communication & Ratings",
  troubleshooting: "Troubleshooting",
};

const CATEGORY_ICONS: Record<string, JSX.Element> = {
  getting_started: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  vessels: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 17h1l2-4h12l2 4h1M5 17l-2 4h18l-2-4M12 3v10M8 7l4-4 4 4" />
    </svg>
  ),
  equipment: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  mechanics: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  work_orders: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  billing: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  troubleshooting: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// ============================================
// TYPES
// ============================================

type Book = "owner" | "mechanic";

interface GuideListItem {
  _id: Id<"helpGuides">;
  title: string;
  summary: string;
  category: string;
  book?: string;
  sortOrder: number;
  isPlaceholder: boolean;
}

// ============================================
// MARKDOWN RENDERER
// ============================================

function MarkdownContent({ content, mode }: { content: string; mode: "dark" | "light" }) {
  const lines = content.split("\n");
  const elements: JSX.Element[] = [];
  let inBlockquote = false;
  let blockquoteLines: string[] = [];
  let listItems: { type: "ul" | "ol"; text: string }[] = [];

  function flushBlockquote(key: number) {
    if (blockquoteLines.length > 0) {
      elements.push(
        <div
          key={`bq-${key}`}
          className={`border-l-4 pl-4 py-3 my-4 rounded-r-lg ${
            mode === "dark"
              ? "border-blue-500/50 bg-blue-500/10 text-blue-200"
              : "border-captain-500 bg-captain-50 text-captain-800"
          }`}
        >
          {blockquoteLines.map((line, j) => (
            <p key={j} className="text-sm">
              {renderInline(line)}
            </p>
          ))}
        </div>
      );
      blockquoteLines = [];
      inBlockquote = false;
    }
  }

  function flushList(key: number) {
    if (listItems.length > 0) {
      const isOrdered = listItems[0].type === "ol";
      const Tag = isOrdered ? "ol" : "ul";
      elements.push(
        <Tag
          key={`list-${key}`}
          className={`my-2 ml-6 space-y-1 ${isOrdered ? "list-decimal" : "list-disc"} ${
            mode === "dark" ? "text-gray-300" : "text-gray-700"
          }`}
        >
          {listItems.map((item, j) => (
            <li key={j} className="text-sm leading-relaxed pl-1">
              {renderInline(item.text)}
            </li>
          ))}
        </Tag>
      );
      listItems = [];
    }
  }

  function renderInline(text: string): (string | JSX.Element)[] {
    const parts: (string | JSX.Element)[] = [];
    // Match **bold**, then *italic*, then `code`
    const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      if (match[1]) {
        // Bold
        parts.push(
          <strong key={match.index} className={mode === "dark" ? "text-white font-semibold" : "text-gray-900 font-semibold"}>
            {match[2]}
          </strong>
        );
      } else if (match[3]) {
        // Italic
        parts.push(
          <em key={match.index} className="italic">
            {match[4]}
          </em>
        );
      } else if (match[5]) {
        // Code
        parts.push(
          <code
            key={match.index}
            className={`px-1.5 py-0.5 rounded text-xs font-mono ${
              mode === "dark" ? "bg-white/10 text-blue-300" : "bg-gray-100 text-captain-700"
            }`}
          >
            {match[6]}
          </code>
        );
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts.length ? parts : [text];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Blockquote
    if (line.startsWith("> ")) {
      flushList(i);
      inBlockquote = true;
      blockquoteLines.push(line.slice(2));
      continue;
    } else if (inBlockquote) {
      flushBlockquote(i);
    }

    // Headings
    if (line.startsWith("# ")) {
      flushList(i);
      elements.push(
        <h1
          key={i}
          className={`text-2xl font-bold mt-6 mb-3 ${mode === "dark" ? "text-white" : "text-gray-900"}`}
        >
          {line.slice(2)}
        </h1>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      flushList(i);
      elements.push(
        <h2
          key={i}
          className={`text-xl font-semibold mt-6 mb-2 pb-2 border-b ${
            mode === "dark" ? "text-white border-white/10" : "text-gray-900 border-gray-200"
          }`}
        >
          {line.slice(3)}
        </h2>
      );
      continue;
    }
    if (line.startsWith("### ")) {
      flushList(i);
      elements.push(
        <h3
          key={i}
          className={`text-lg font-medium mt-4 mb-1 ${mode === "dark" ? "text-white" : "text-gray-900"}`}
        >
          {line.slice(4)}
        </h3>
      );
      continue;
    }

    // Horizontal rule
    if (line.trim() === "---") {
      flushList(i);
      elements.push(
        <hr key={i} className={`my-6 ${mode === "dark" ? "border-white/10" : "border-gray-200"}`} />
      );
      continue;
    }

    // Unordered list
    if (line.match(/^[-*] /)) {
      const text = line.replace(/^[-*] /, "");
      if (listItems.length > 0 && listItems[0].type === "ol") {
        flushList(i);
      }
      listItems.push({ type: "ul", text });
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\. /)) {
      const text = line.replace(/^\d+\. /, "");
      if (listItems.length > 0 && listItems[0].type === "ul") {
        flushList(i);
      }
      listItems.push({ type: "ol", text });
      continue;
    }

    // Indented list items (sub-items under numbered lists)
    if (line.match(/^\s+[-*] /)) {
      const text = line.replace(/^\s+[-*] /, "");
      listItems.push({ type: "ul", text });
      continue;
    }

    // Non-list line: flush any pending list
    flushList(i);

    // Empty line
    if (line.trim() === "") {
      continue;
    }

    // Regular paragraph
    elements.push(
      <p
        key={i}
        className={`mb-3 text-sm leading-relaxed ${mode === "dark" ? "text-gray-300" : "text-gray-700"}`}
      >
        {renderInline(line)}
      </p>
    );
  }

  // Flush remaining
  flushBlockquote(lines.length);
  flushList(lines.length);

  return <div className="prose-custom">{elements}</div>;
}

// ============================================
// HELP CENTER COMPONENT
// ============================================

export function HelpCenter() {
  const { mode } = useTheme();
  const currentUser = useQuery(api.users.currentUser);
  const userRole = currentUser?.role || "owner";

  // State
  const [activeBook, setActiveBook] = useState<Book>(
    userRole === "mechanic" ? "mechanic" : "owner"
  );
  const [selectedGuideId, setSelectedGuideId] = useState<Id<"helpGuides"> | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Queries
  const guides = useQuery(api.helpGuides.getGuidesByBook, { book: activeBook });
  const searchResults = useQuery(
    api.helpGuides.searchGuides,
    searchTerm.length >= 2 ? { searchTerm, book: activeBook } : "skip"
  );
  const selectedGuide = useQuery(
    api.helpGuides.getGuide,
    selectedGuideId ? { guideId: selectedGuideId } : "skip"
  );

  // Update book when user role changes
  useEffect(() => {
    if (userRole === "mechanic") {
      setActiveBook("mechanic");
    } else if (userRole === "owner") {
      setActiveBook("owner");
    }
  }, [userRole]);

  // Auto-select first guide when book changes or guides load
  useEffect(() => {
    if (guides && guides.length > 0 && !selectedGuideId) {
      setSelectedGuideId(guides[0]._id);
    }
  }, [guides, selectedGuideId]);

  // Reset selection when book changes
  useEffect(() => {
    setSelectedGuideId(null);
    setSearchTerm("");
  }, [activeBook]);

  // Group guides by category
  const groupedGuides = useMemo(() => {
    const source = searchTerm.length >= 2 && searchResults ? searchResults : guides;
    if (!source) return {};

    const grouped: Record<string, GuideListItem[]> = {};
    for (const guide of source) {
      if (!grouped[guide.category]) {
        grouped[guide.category] = [];
      }
      grouped[guide.category].push(guide);
    }
    return grouped;
  }, [guides, searchResults, searchTerm]);

  // Flat ordered list for prev/next navigation
  const orderedGuides = useMemo(() => {
    if (!guides) return [];
    const ordered: GuideListItem[] = [];
    for (const cat of CATEGORY_ORDER) {
      const catGuides = guides.filter((g) => g.category === cat);
      catGuides.sort((a, b) => a.sortOrder - b.sortOrder);
      ordered.push(...catGuides);
    }
    return ordered;
  }, [guides]);

  const currentIndex = orderedGuides.findIndex((g) => g._id === selectedGuideId);
  const prevGuide = currentIndex > 0 ? orderedGuides[currentIndex - 1] : null;
  const nextGuide = currentIndex < orderedGuides.length - 1 ? orderedGuides[currentIndex + 1] : null;

  const categoryLabels = activeBook === "mechanic" ? MECHANIC_CATEGORY_LABELS : CATEGORY_LABELS;

  // Find current guide's category for breadcrumb
  const currentGuideInfo = orderedGuides.find((g) => g._id === selectedGuideId);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-xl ${
          mode === "dark"
            ? "bg-[#0F0F17]/90 border-white/10"
            : "bg-white/80 border-gray-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Top row: back button, title, search */}
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link
                href="/home"
                className={`p-2 rounded-lg transition-colors ${
                  mode === "dark"
                    ? "text-gray-400 hover:text-white hover:bg-white/10"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className={`text-xl font-bold ${mode === "dark" ? "text-white" : "text-gray-900"}`}>
                  Help & Documentation
                </h1>
                <p className={`text-xs hidden sm:block ${mode === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                  Step-by-step guides for every feature
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="w-64 sm:w-80">
              <div className="relative">
                <svg
                  className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                    mode === "dark" ? "text-gray-500" : "text-gray-400"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <GlassInput
                  type="text"
                  placeholder="Search guides..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 !py-2 !text-sm !rounded-lg"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                      mode === "dark" ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Book tabs */}
          <div className="flex items-center gap-1 -mb-px">
            <button
              onClick={() => setActiveBook("owner")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeBook === "owner"
                  ? mode === "dark"
                    ? "border-blue-500 text-blue-400"
                    : "border-captain-600 text-captain-700"
                  : mode === "dark"
                    ? "border-transparent text-gray-500 hover:text-gray-300"
                    : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Owner&apos;s Guide
              </span>
            </button>
            <button
              onClick={() => setActiveBook("mechanic")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeBook === "mechanic"
                  ? mode === "dark"
                    ? "border-blue-500 text-blue-400"
                    : "border-captain-600 text-captain-700"
                  : mode === "dark"
                    ? "border-transparent text-gray-500 hover:text-gray-300"
                    : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Mechanic&apos;s Guide
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        className={`lg:hidden fixed bottom-6 left-6 z-40 p-3 rounded-full shadow-lg ${
          mode === "dark" ? "bg-blue-600 text-white" : "bg-captain-600 text-white"
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar - Desktop */}
        <aside
          className={`hidden lg:block w-72 xl:w-80 flex-shrink-0 border-r overflow-y-auto sticky top-[105px] h-[calc(100vh-105px)] ${
            mode === "dark" ? "border-white/10" : "border-gray-200"
          } ${!sidebarOpen ? "lg:hidden" : ""}`}
        >
          <SidebarContent
            groupedGuides={groupedGuides}
            categoryLabels={categoryLabels}
            selectedGuideId={selectedGuideId}
            onSelectGuide={(id) => setSelectedGuideId(id)}
            mode={mode}
            searchTerm={searchTerm}
          />
        </aside>

        {/* Sidebar - Mobile overlay */}
        {mobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <aside
              className={`absolute left-0 top-0 bottom-0 w-80 overflow-y-auto ${
                mode === "dark" ? "bg-[#0F0F17]" : "bg-white"
              }`}
            >
              <div className={`flex items-center justify-between p-4 border-b ${mode === "dark" ? "border-white/10" : "border-gray-200"}`}>
                <h3 className={`font-semibold ${mode === "dark" ? "text-white" : "text-gray-900"}`}>Chapters</h3>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`p-2 rounded-lg ${mode === "dark" ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-700"}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <SidebarContent
                groupedGuides={groupedGuides}
                categoryLabels={categoryLabels}
                selectedGuideId={selectedGuideId}
                onSelectGuide={(id) => {
                  setSelectedGuideId(id);
                  setMobileSidebarOpen(false);
                }}
                mode={mode}
                searchTerm={searchTerm}
              />
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Sidebar collapse toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`hidden lg:flex items-center gap-1 px-3 py-1.5 m-4 mb-0 text-xs rounded-lg transition-colors ${
              mode === "dark"
                ? "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            }`}
          >
            <svg
              className={`w-4 h-4 transition-transform ${sidebarOpen ? "" : "rotate-180"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            {sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          </button>

          <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
            {/* Breadcrumb */}
            {currentGuideInfo && (
              <nav className="mb-4">
                <ol className="flex items-center gap-1.5 text-xs">
                  <li className={mode === "dark" ? "text-gray-500" : "text-gray-400"}>
                    {activeBook === "owner" ? "Owner's Guide" : "Mechanic's Guide"}
                  </li>
                  <li className={mode === "dark" ? "text-gray-600" : "text-gray-300"}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </li>
                  <li className={mode === "dark" ? "text-gray-500" : "text-gray-400"}>
                    {categoryLabels[currentGuideInfo.category] || currentGuideInfo.category}
                  </li>
                  <li className={mode === "dark" ? "text-gray-600" : "text-gray-300"}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </li>
                  <li className={`truncate ${mode === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                    {currentGuideInfo.title}
                  </li>
                </ol>
              </nav>
            )}

            {/* Article content */}
            {!guides ? (
              // Loading state
              <div className="animate-pulse space-y-4">
                <div className={`h-8 w-2/3 rounded ${mode === "dark" ? "bg-white/10" : "bg-gray-200"}`} />
                <div className={`h-4 w-full rounded ${mode === "dark" ? "bg-white/10" : "bg-gray-200"}`} />
                <div className={`h-4 w-5/6 rounded ${mode === "dark" ? "bg-white/10" : "bg-gray-200"}`} />
                <div className={`h-4 w-4/6 rounded ${mode === "dark" ? "bg-white/10" : "bg-gray-200"}`} />
              </div>
            ) : selectedGuide ? (
              <article>
                {/* Placeholder banner */}
                {selectedGuide.isPlaceholder && (
                  <div
                    className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${
                      mode === "dark"
                        ? "bg-amber-500/10 border border-amber-500/20 text-amber-200"
                        : "bg-amber-50 border border-amber-200 text-amber-800"
                    }`}
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <p className="font-medium text-sm">Coming Soon</p>
                      <p className="text-xs opacity-75">
                        This guide is being written. Detailed instructions will be available once this feature is finalized.
                      </p>
                    </div>
                  </div>
                )}

                {/* Article body */}
                <MarkdownContent content={selectedGuide.content} mode={mode} />
              </article>
            ) : guides.length === 0 ? (
              <div className="text-center py-16">
                <svg
                  className={`w-16 h-16 mx-auto mb-4 ${mode === "dark" ? "text-gray-700" : "text-gray-300"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h3 className={`text-lg font-semibold mb-2 ${mode === "dark" ? "text-white" : "text-gray-900"}`}>
                  No guides available
                </h3>
                <p className={`text-sm ${mode === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                  {searchTerm
                    ? `No guides found for "${searchTerm}". Try a different search term.`
                    : "Help guides haven't been set up yet. Check back soon!"}
                </p>
              </div>
            ) : (
              <div className="text-center py-16">
                <p className={`text-sm ${mode === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                  Select a guide from the sidebar to get started.
                </p>
              </div>
            )}

            {/* Prev / Next navigation */}
            {selectedGuide && !searchTerm && (
              <div
                className={`flex items-stretch gap-4 mt-10 pt-6 border-t ${
                  mode === "dark" ? "border-white/10" : "border-gray-200"
                }`}
              >
                {prevGuide ? (
                  <button
                    onClick={() => setSelectedGuideId(prevGuide._id)}
                    className={`flex-1 text-left p-4 rounded-xl border transition-all group ${
                      mode === "dark"
                        ? "border-white/10 hover:border-white/20 hover:bg-white/5"
                        : "border-gray-200 hover:border-captain-300 hover:bg-captain-50/50"
                    }`}
                  >
                    <div className={`flex items-center gap-1 text-xs mb-1 ${mode === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous
                    </div>
                    <div className={`text-sm font-medium ${mode === "dark" ? "text-gray-300 group-hover:text-white" : "text-gray-700 group-hover:text-gray-900"}`}>
                      {prevGuide.title}
                    </div>
                  </button>
                ) : (
                  <div className="flex-1" />
                )}
                {nextGuide ? (
                  <button
                    onClick={() => setSelectedGuideId(nextGuide._id)}
                    className={`flex-1 text-right p-4 rounded-xl border transition-all group ${
                      mode === "dark"
                        ? "border-white/10 hover:border-white/20 hover:bg-white/5"
                        : "border-gray-200 hover:border-captain-300 hover:bg-captain-50/50"
                    }`}
                  >
                    <div className={`flex items-center justify-end gap-1 text-xs mb-1 ${mode === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                      Next
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <div className={`text-sm font-medium ${mode === "dark" ? "text-gray-300 group-hover:text-white" : "text-gray-700 group-hover:text-gray-900"}`}>
                      {nextGuide.title}
                    </div>
                  </button>
                ) : (
                  <div className="flex-1" />
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ============================================
// SIDEBAR CONTENT
// ============================================

function SidebarContent({
  groupedGuides,
  categoryLabels,
  selectedGuideId,
  onSelectGuide,
  mode,
  searchTerm,
}: {
  groupedGuides: Record<string, GuideListItem[]>;
  categoryLabels: Record<string, string>;
  selectedGuideId: Id<"helpGuides"> | null;
  onSelectGuide: (id: Id<"helpGuides">) => void;
  mode: "dark" | "light";
  searchTerm: string;
}) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(CATEGORY_ORDER)
  );

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  // Auto-expand category of selected guide
  useEffect(() => {
    if (selectedGuideId) {
      for (const [cat, guides] of Object.entries(groupedGuides)) {
        if (guides.some((g) => g._id === selectedGuideId)) {
          setExpandedCategories((prev) => {
            const next = new Set(prev);
            next.add(cat);
            return next;
          });
          break;
        }
      }
    }
  }, [selectedGuideId, groupedGuides]);

  const categoriesWithGuides = CATEGORY_ORDER.filter((cat) => groupedGuides[cat]?.length);

  if (categoriesWithGuides.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className={`text-sm ${mode === "dark" ? "text-gray-500" : "text-gray-400"}`}>
          {searchTerm ? "No matching guides found." : "No guides available."}
        </p>
      </div>
    );
  }

  return (
    <nav className="py-3">
      {categoriesWithGuides.map((category) => {
        const catGuides = groupedGuides[category] || [];
        const isExpanded = expandedCategories.has(category);
        const icon = CATEGORY_ICONS[category];
        const guideCount = catGuides.length;

        return (
          <div key={category} className="mb-1">
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category)}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors ${
                mode === "dark"
                  ? "hover:bg-white/5 text-gray-300"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <span className={`flex-shrink-0 ${mode === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                {icon}
              </span>
              <span className="flex-1 text-sm font-medium truncate">
                {categoryLabels[category] || category}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                mode === "dark" ? "bg-white/10 text-gray-500" : "bg-gray-200 text-gray-500"
              }`}>
                {guideCount}
              </span>
              <svg
                className={`w-4 h-4 flex-shrink-0 transition-transform ${
                  isExpanded ? "rotate-90" : ""
                } ${mode === "dark" ? "text-gray-600" : "text-gray-400"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Guide list */}
            {isExpanded && (
              <div className="pb-1">
                {catGuides.map((guide) => {
                  const isSelected = guide._id === selectedGuideId;
                  return (
                    <button
                      key={guide._id}
                      onClick={() => onSelectGuide(guide._id)}
                      className={`w-full text-left pl-12 pr-4 py-2 text-sm transition-colors ${
                        isSelected
                          ? mode === "dark"
                            ? "bg-blue-500/15 text-blue-300 border-l-2 border-blue-500"
                            : "bg-captain-50 text-captain-700 border-l-2 border-captain-600"
                          : mode === "dark"
                            ? "text-gray-400 hover:text-gray-200 hover:bg-white/5 border-l-2 border-transparent"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-l-2 border-transparent"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="truncate">{guide.title}</span>
                        {guide.isPlaceholder && (
                          <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full ${
                            mode === "dark"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            Soon
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
