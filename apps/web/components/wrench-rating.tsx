"use client";

import { useMemo } from "react";
import { useTheme } from "./providers/theme-provider";

interface WrenchRatingProps {
  rating: number;                    // 0-5, supports decimals
  maxRating?: number;                // Default 5
  size?: "sm" | "md" | "lg" | "xl";  // Size of icons
  showValue?: boolean;               // Show numeric value
  showCount?: boolean;               // Show count of ratings
  totalRatings?: number;             // Total number of ratings
  interactive?: boolean;             // Allow clicking to set rating
  onChange?: (rating: number) => void;
  className?: string;
}

// Wrench SVG icon component
function WrenchIcon({ 
  filled, 
  halfFilled,
  size,
  interactive,
  onClick,
}: { 
  filled: boolean;
  halfFilled?: boolean;
  size: string;
  interactive?: boolean;
  onClick?: () => void;
}) {
  const baseClasses = `${size} transition-colors duration-150`;
  const interactiveClasses = interactive ? "cursor-pointer hover:scale-110" : "";
  
  // Color based on fill state
  const fillColor = filled ? "#2563eb" : halfFilled ? "#2563eb" : "#d1d5db";
  const emptyColor = "#d1d5db";

  if (halfFilled) {
    // Half-filled wrench using gradient
    return (
      <svg
        className={`${baseClasses} ${interactiveClasses}`}
        viewBox="0 0 24 24"
        fill="none"
        onClick={onClick}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="halfWrench" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="50%" stopColor={fillColor} />
            <stop offset="50%" stopColor={emptyColor} />
          </linearGradient>
        </defs>
        <path
          d="M21.71 20.29l-1.42 1.42a1 1 0 01-1.41 0L14 16.83l-1.17 1.17-.71-.71 1.17-1.17-8.46-8.46a4 4 0 01-.22-5.42l.71-.71.71.71-1 1L6.29 4.5l1-1 .71.71-.71.71a2 2 0 00.22 2.83l8.46 8.46 1.17-1.17.71.71-1.17 1.17 4.88 4.88a1 1 0 010 1.41zM17.5 10a1.5 1.5 0 001.5-1.5 1.5 1.5 0 00-3 0 1.5 1.5 0 001.5 1.5z"
          fill="url(#halfWrench)"
        />
      </svg>
    );
  }

  return (
    <svg
      className={`${baseClasses} ${interactiveClasses}`}
      viewBox="0 0 24 24"
      fill={filled ? fillColor : emptyColor}
      onClick={onClick}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"
      />
    </svg>
  );
}

export function WrenchRating({
  rating,
  maxRating = 5,
  size = "md",
  showValue = false,
  showCount = false,
  totalRatings = 0,
  interactive = false,
  onChange,
  className = "",
}: WrenchRatingProps) {
  const { mode } = useTheme();
  // Determine icon size based on prop
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
  };

  const iconSize = sizeClasses[size];

  // Generate array of wrench states
  const wrenches = useMemo(() => {
    const result = [];
    for (let i = 1; i <= maxRating; i++) {
      if (rating >= i) {
        result.push({ index: i, filled: true, halfFilled: false });
      } else if (rating >= i - 0.5) {
        result.push({ index: i, filled: false, halfFilled: true });
      } else {
        result.push({ index: i, filled: false, halfFilled: false });
      }
    }
    return result;
  }, [rating, maxRating]);

  const handleClick = (index: number) => {
    if (interactive && onChange) {
      onChange(index);
    }
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex items-center gap-0.5">
        {wrenches.map((wrench) => (
          <WrenchIcon
            key={wrench.index}
            filled={wrench.filled}
            halfFilled={wrench.halfFilled}
            size={iconSize}
            interactive={interactive}
            onClick={() => handleClick(wrench.index)}
          />
        ))}
      </div>
      
      {showValue && (
        <span className={`text-sm font-medium ${mode === 'dark' ? "text-gray-300" : "text-gray-700"} ml-1`}>
          {rating.toFixed(1)}
        </span>
      )}
      
      {showCount && totalRatings > 0 && (
        <span className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"} ml-1`}>
          ({totalRatings} {totalRatings === 1 ? "review" : "reviews"})
        </span>
      )}
    </div>
  );
}

// Interactive wrench rating for forms
interface InteractiveWrenchRatingProps {
  value: number;
  onChange: (rating: number) => void;
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
  required?: boolean;
}

export function InteractiveWrenchRating({
  value,
  onChange,
  size = "lg",
  label,
  required = false,
}: InteractiveWrenchRatingProps) {
  const { mode } = useTheme();
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
    xl: "w-12 h-12",
  };

  const iconSize = sizeClasses[size];

  const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <div className="space-y-2">
      {label && (
        <label className={`block text-sm font-medium ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => onChange(rating)}
              className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full p-1 transition-transform hover:scale-110"
            >
              <WrenchIcon
                filled={rating <= value}
                size={iconSize}
                interactive
              />
            </button>
          ))}
        </div>
        {value > 0 && (
          <span className="text-sm font-medium text-blue-600">
            {ratingLabels[value]}
          </span>
        )}
      </div>
    </div>
  );
}

// Display rating breakdown by criteria
interface RatingBreakdownProps {
  criteria: {
    label: string;
    rating: number;
  }[];
  size?: "sm" | "md";
}

export function WrenchRatingBreakdown({ criteria, size = "sm" }: RatingBreakdownProps) {
  const { mode } = useTheme();
  return (
    <div className="space-y-2">
      {criteria.map((item, index) => (
        <div key={index} className="flex items-center justify-between">
          <span className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>{item.label}</span>
          <WrenchRating rating={item.rating} size={size} showValue />
        </div>
      ))}
    </div>
  );
}
