"use client";

import { useMemo } from "react";

interface StarRatingProps {
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

// Star SVG icon component
function StarIcon({ 
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
  
  // Color based on fill state - golden yellow for stars
  const fillColor = "#f59e0b"; // amber-500
  const emptyColor = "#d1d5db"; // gray-300

  if (halfFilled) {
    // Half-filled star using gradient
    return (
      <svg
        className={`${baseClasses} ${interactiveClasses}`}
        viewBox="0 0 24 24"
        fill="none"
        onClick={onClick}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="halfStar" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="50%" stopColor={fillColor} />
            <stop offset="50%" stopColor={emptyColor} />
          </linearGradient>
        </defs>
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill="url(#halfStar)"
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
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      />
    </svg>
  );
}

export function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  showValue = false,
  showCount = false,
  totalRatings = 0,
  interactive = false,
  onChange,
  className = "",
}: StarRatingProps) {
  // Determine icon size based on prop
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
  };

  const iconSize = sizeClasses[size];

  // Generate array of star states
  const stars = useMemo(() => {
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
        {stars.map((star) => (
          <StarIcon
            key={star.index}
            filled={star.filled}
            halfFilled={star.halfFilled}
            size={iconSize}
            interactive={interactive}
            onClick={() => handleClick(star.index)}
          />
        ))}
      </div>
      
      {showValue && (
        <span className="text-sm font-medium text-gray-700 ml-1">
          {rating.toFixed(1)}
        </span>
      )}
      
      {showCount && totalRatings > 0 && (
        <span className="text-sm text-gray-500 ml-1">
          ({totalRatings} {totalRatings === 1 ? "review" : "reviews"})
        </span>
      )}
    </div>
  );
}

// Interactive star rating for forms
interface InteractiveStarRatingProps {
  value: number;
  onChange: (rating: number) => void;
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
  required?: boolean;
}

export function InteractiveStarRating({
  value,
  onChange,
  size = "lg",
  label,
  required = false,
}: InteractiveStarRatingProps) {
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
        <label className="block text-sm font-medium text-gray-700">
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
              className="focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 rounded-full p-1 transition-transform hover:scale-110"
            >
              <StarIcon
                filled={rating <= value}
                size={iconSize}
                interactive
              />
            </button>
          ))}
        </div>
        {value > 0 && (
          <span className="text-sm font-medium text-amber-600">
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

export function StarRatingBreakdown({ criteria, size = "sm" }: RatingBreakdownProps) {
  return (
    <div className="space-y-2">
      {criteria.map((item, index) => (
        <div key={index} className="flex items-center justify-between">
          <span className="text-sm text-gray-600">{item.label}</span>
          <StarRating rating={item.rating} size={size} showValue />
        </div>
      ))}
    </div>
  );
}
