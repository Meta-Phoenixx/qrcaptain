"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useTheme } from "./providers/theme-provider";

export interface PartSuggestion {
  _id?: string;
  partNumber: string;
  name: string;
  manufacturer: string;
  category?: string;
  description?: string;
  averagePrice?: number;
  isNew?: boolean; // For "Add as new part" option
}

interface PartsAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (part: PartSuggestion) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function PartsAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Search parts or enter new...",
  disabled = false,
  className = "",
}: PartsAutocompleteProps) {
  const { mode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(value);
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  // Search parts from database
  const searchResults = useQuery(
    api.parts.searchParts,
    debouncedQuery.length >= 2 ? { searchQuery: debouncedQuery, limit: 10 } : "skip"
  );

  // Get popular parts when no search query
  const popularParts = useQuery(
    api.parts.getPopularParts,
    debouncedQuery.length < 2 ? { limit: 5 } : "skip"
  );

  // Combine results
  const suggestions: PartSuggestion[] = debouncedQuery.length >= 2
    ? (searchResults || []).map(p => ({
        _id: p._id,
        partNumber: p.partNumber,
        name: p.name,
        manufacturer: p.manufacturer,
        category: p.category,
        description: p.description,
        averagePrice: p.averagePrice,
      }))
    : (popularParts || []).map(p => ({
        _id: p._id,
        partNumber: p.partNumber,
        name: p.name,
        manufacturer: p.manufacturer,
        category: p.category,
        description: p.description,
        averagePrice: p.averagePrice,
      }));

  // Add "Add as new part" option if search query doesn't match
  const hasExactMatch = suggestions.some(
    s => s.name.toLowerCase() === value.toLowerCase() ||
         s.partNumber.toLowerCase() === value.toLowerCase()
  );

  const displaySuggestions: PartSuggestion[] = value.length >= 2 && !hasExactMatch
    ? [
        ...suggestions,
        {
          partNumber: "",
          name: value,
          manufacturer: "",
          isNew: true,
        },
      ]
    : suggestions;

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(prev => 
          Math.min(prev + 1, displaySuggestions.length - 1)
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (displaySuggestions[highlightedIndex]) {
          handleSelect(displaySuggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  }, [isOpen, displaySuggestions, highlightedIndex]);

  // Handle selection
  const handleSelect = (part: PartSuggestion) => {
    onSelect(part);
    onChange("");
    setIsOpen(false);
    setHighlightedIndex(0);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [displaySuggestions.length]);

  // Category badge color
  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      engine: "bg-red-100 text-red-700",
      electrical: "bg-yellow-100 text-yellow-700",
      plumbing: "bg-blue-100 text-blue-700",
      fuel: "bg-orange-100 text-orange-700",
      cooling: "bg-cyan-100 text-cyan-700",
      steering: "bg-purple-100 text-purple-700",
      hvac: "bg-green-100 text-green-700",
      safety: "bg-pink-100 text-pink-700",
      general: "bg-gray-100 text-gray-700",
    };
    return colors[category || "general"] || colors.general;
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-captain-500 focus:border-captain-500 ${mode === 'dark' ? "bg-white/5 border-white/10 text-white placeholder-gray-500 disabled:bg-white/[0.02]" : "border-gray-300 text-gray-900 placeholder-gray-400 disabled:bg-gray-100"} disabled:cursor-not-allowed`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && displaySuggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className={`absolute z-50 w-full mt-1 ${mode === 'dark' ? "bg-gray-800 border-white/10" : "bg-white border-gray-200"} border rounded-lg shadow-lg max-h-80 overflow-y-auto`}
        >
          {debouncedQuery.length < 2 && (
            <div className={`px-3 py-2 text-xs font-medium ${mode === 'dark' ? "text-gray-400 bg-white/5 border-white/10" : "text-gray-500 bg-gray-50 border-b"}`}>
              Popular Parts
            </div>
          )}

          {displaySuggestions.map((part, index) => (
            <div
              key={part._id || `new-${index}`}
              onClick={() => handleSelect(part)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`px-3 py-2.5 cursor-pointer transition-colors ${
                index === highlightedIndex ? "bg-captain-50" : mode === 'dark' ? "hover:bg-white/5" : "hover:bg-gray-50"
              } ${index !== displaySuggestions.length - 1 ? `border-b ${mode === 'dark' ? "border-white/5" : "border-gray-100"}` : ""}`}
            >
              {part.isNew ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-captain-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-captain-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-captain-600">Add "{part.name}" as new part</p>
                    <p className="text-xs text-gray-500">Enter details manually</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"} truncate`}>{part.name}</p>
                      {part.category && (
                        <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${getCategoryColor(part.category)}`}>
                          {part.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>{part.manufacturer}</span>
                      {part.partNumber && (
                        <>
                          <span className={`${mode === 'dark' ? "text-gray-600" : "text-gray-300"}`}>•</span>
                          <span className="text-sm text-gray-500 font-mono">{part.partNumber}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {part.averagePrice && (
                    <span className={`text-sm font-medium ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
                      ${part.averagePrice.toFixed(2)}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Loading state */}
      {isOpen && debouncedQuery.length >= 2 && searchResults === undefined && (
        <div className={`absolute z-50 w-full mt-1 ${mode === 'dark' ? "bg-gray-800 border-white/10" : "bg-white border-gray-200"} border rounded-lg shadow-lg p-4`}>
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <div className={`w-4 h-4 border-2 ${mode === 'dark' ? "border-white/10" : "border-gray-300"} border-t-captain-600 rounded-full animate-spin`}></div>
            <span className="text-sm">Searching...</span>
          </div>
        </div>
      )}

      {/* No results */}
      {isOpen && debouncedQuery.length >= 2 && searchResults && searchResults.length === 0 && (
        <div
          ref={dropdownRef}
          className={`absolute z-50 w-full mt-1 ${mode === 'dark' ? "bg-gray-800 border-white/10" : "bg-white border-gray-200"} border rounded-lg shadow-lg`}
        >
          <div
            onClick={() => handleSelect({
              partNumber: "",
              name: value,
              manufacturer: "",
              isNew: true,
            })}
            className="px-3 py-3 cursor-pointer hover:bg-captain-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-captain-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-captain-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-captain-600">Add "{value}" as new part</p>
                <p className="text-xs text-gray-500">No matching parts found - enter details manually</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
