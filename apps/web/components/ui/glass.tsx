"use client";

import React from "react";
import { useTheme } from "../providers/theme-provider";

// --- Glass Primitives ---

export const GlassCard = ({
  children,
  className = "",
  interactive = false,
  onClick,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
}) => {
  const { mode } = useTheme();
  return (
    <div
      className={`
        backdrop-blur-xl rounded-2xl overflow-hidden border transition-all duration-300
        ${mode === 'dark' 
          ? "bg-gradient-to-br from-white/10 to-white/5 border-white/10 shadow-[0_4px_24px_-1px_rgba(0,0,0,0.2)]" 
          : "bg-gradient-to-br from-white/80 to-white/40 border-white/60 shadow-[0_4px_24px_-1px_rgba(0,0,0,0.05)]"}
        ${interactive 
          ? `hover:-translate-y-2 hover:shadow-[0_12px_40px_-4px_rgba(0,0,0,0.4)] cursor-pointer 
             ${mode === 'dark' ? "hover:border-white/20 hover:from-white/15 hover:to-white/10" : "hover:border-white/80 hover:from-white/90 hover:to-white/50"}` 
          : ""}
        ${className}
      `}
      style={{
        boxShadow: mode === 'dark' 
          ? "inset 0 1px 0 0 rgba(255,255,255,0.1), 0 4px 24px -1px rgba(0,0,0,0.2)"
          : "inset 0 1px 0 0 rgba(255,255,255,0.6), 0 4px 24px -1px rgba(0,0,0,0.05)"
      }}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

export const GlassButton = ({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) => {
  const { mode } = useTheme();
  const baseStyles = "px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 hover:-translate-y-1";
  
  const variants = {
    primary: mode === 'dark'
      ? `bg-gradient-to-b from-white/20 to-white/5 border border-white/10 text-white 
         hover:from-white/25 hover:to-white/10 hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]`
      : `bg-gradient-to-b from-gray-900 to-gray-800 border border-gray-700 text-white
         hover:from-gray-800 hover:to-gray-700 hover:shadow-lg`,
    secondary: mode === 'dark'
      ? "bg-white/5 hover:bg-white/10 border border-white/10 text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
      : "bg-white/50 hover:bg-white/80 border border-gray-200 text-gray-800 shadow-sm hover:shadow-md",
    ghost: mode === 'dark'
      ? "bg-transparent hover:bg-white/5 text-gray-300 hover:text-white"
      : "bg-transparent hover:bg-black/5 text-gray-500 hover:text-gray-900",
  };

  const pseudo3DStyles = variant === 'primary' ? {
    boxShadow: mode === 'dark'
      ? "inset 0 1px 0 0 rgba(255,255,255,0.2), 0 4px 4px 0 rgba(0,0,0,0.3)"
      : "inset 0 1px 0 0 rgba(255,255,255,0.3), 0 4px 4px 0 rgba(0,0,0,0.2)"
  } : {};

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      style={pseudo3DStyles}
      {...props}
    >
      {children}
    </button>
  );
};

export const GlassInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: React.ReactNode }>(({ className = "", label, ...props }, ref) => {
  const { mode } = useTheme();
  const input = (
    <input
      ref={ref}
      className={`
        w-full rounded-xl px-4 py-3 backdrop-blur-md transition-all
        focus:outline-none focus:ring-1 
        ${mode === 'dark'
          ? "bg-black/20 border border-white/10 text-white placeholder-gray-400 focus:border-blue-500/50 focus:ring-blue-500/50"
          : "bg-white/50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:bg-white"}
        ${className}
      `}
      {...props}
    />
  );
  if (!label) return input;
  return (
    <div>
      <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>{label}</label>
      {input}
    </div>
  );
});
GlassInput.displayName = "GlassInput";

interface GlassSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export const GlassSelect = ({ className = "", label, options, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: React.ReactNode;
  options?: GlassSelectOption[];
}) => {
  const { mode } = useTheme();
  const select = (
    <select
      className={`
        w-full rounded-xl px-4 py-3 backdrop-blur-md appearance-none transition-all
        focus:outline-none focus:ring-1
        ${mode === 'dark'
          ? "bg-black/20 border border-white/10 text-white focus:border-blue-500/50 focus:ring-blue-500/50"
          : "bg-white/50 border border-gray-200 text-gray-900 focus:border-blue-500 focus:ring-blue-500 focus:bg-white"}
        ${className}
      `}
      {...props}
    >
      {options
        ? options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))
        : children}
    </select>
  );
  if (!label) return select;
  return (
    <div>
      <label className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>{label}</label>
      {select}
    </div>
  );
};

export const GlassBadge = ({ children, color = "blue" }: { children: React.ReactNode; color?: "blue" | "green" | "yellow" | "red" }) => {
  const { mode } = useTheme();
  const colors = {
    dark: {
      blue: "bg-blue-500/20 text-blue-200 border-blue-500/30",
      green: "bg-emerald-500/20 text-emerald-200 border-emerald-500/30",
      yellow: "bg-amber-500/20 text-amber-200 border-amber-500/30",
      red: "bg-red-500/20 text-red-200 border-red-500/30",
    },
    light: {
      blue: "bg-blue-50 text-blue-700 border-blue-200",
      green: "bg-emerald-50 text-emerald-700 border-emerald-200",
      yellow: "bg-amber-50 text-amber-700 border-amber-200",
      red: "bg-red-50 text-red-700 border-red-200",
    }
  };
  
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${colors[mode][color]} backdrop-blur-sm`}>
      {children}
    </span>
  );
};

export const GlassModal = ({
  children,
  onClose,
  className = "",
}: {
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}) => {
  const { mode } = useTheme();
  
  // Close on Escape key
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div 
        className={`
          relative w-full max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl transition-all
          ${mode === 'dark' 
            ? "bg-[#1A1A23] border-white/10 text-white" 
            : "bg-white border-white/40 text-gray-900"}
          ${className}
        `}
      >
        {children}
      </div>
    </div>
  );
};
