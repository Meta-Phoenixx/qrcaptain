"use client";

import React, { useState } from "react";
import { Ubuntu, Inter } from "next/font/google";

// Load fonts
const ubuntu = Ubuntu({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-ubuntu",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
});

import {
  Wrench,
  Star,
  CheckCircle,
  Sun,
  Moon,
} from "lucide-react";

// --- Theme Context ---

type ThemeMode = "dark" | "light";

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextType>({
  mode: "dark",
  toggleTheme: () => {},
});

const useTheme = () => React.useContext(ThemeContext);

// --- Glass Primitives ---

const GlassCard = ({
  children,
  className = "",
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
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
    >
      {children}
    </div>
  );
};

const GlassButton = ({
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
      ? "bg-transparent hover:bg-white/5 text-gray-400 hover:text-white"
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

const GlassInput = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => {
  const { mode } = useTheme();
  return (
    <input
      className={`
        w-full rounded-xl px-4 py-3 backdrop-blur-md transition-all
        focus:outline-none focus:ring-1 
        ${mode === 'dark'
          ? "bg-black/20 border border-white/10 text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-blue-500/50"
          : "bg-white/50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:bg-white"}
        ${className}
      `}
      {...props}
    />
  );
};

const GlassSelect = ({ className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => {
  const { mode } = useTheme();
  return (
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
      {props.children}
    </select>
  );
};

const GlassBadge = ({ children, color = "blue" }: { children: React.ReactNode; color?: "blue" | "green" | "yellow" | "red" }) => {
  const { mode } = useTheme();
  const colors = {
    dark: {
      blue: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      green: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      yellow: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      red: "bg-red-500/20 text-red-300 border-red-500/30",
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

// --- Mock Components in Glass Style ---

const ShadowDemo = () => {
  const { mode } = useTheme();
  
  const shadows = [
    { name: "Small", class: mode === 'dark' ? "shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5)]" : "shadow-sm", desc: "Elevation 1" },
    { name: "Medium", class: mode === 'dark' ? "shadow-[0_10px_15px_-3px_rgba(0,0,0,0.5)]" : "shadow-md", desc: "Elevation 2" },
    { name: "Large", class: mode === 'dark' ? "shadow-[0_20px_25px_-5px_rgba(0,0,0,0.5)]" : "shadow-xl", desc: "Elevation 3" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {shadows.map((shadow) => (
        <div 
          key={shadow.name}
          className={`
            h-32 rounded-2xl flex flex-col items-center justify-center gap-2
            backdrop-blur-xl border transition-all
            ${mode === 'dark' 
              ? "bg-white/5 border-white/10" 
              : "bg-white border-white/40"}
            ${shadow.class}
          `}
        >
          <span className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{shadow.name}</span>
          <span className={`text-xs font-mono ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>{shadow.desc}</span>
        </div>
      ))}
    </div>
  );
};

const MockLoadingSpinner = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const { mode } = useTheme();
  const sizes = { sm: "w-4 h-4 border-2", md: "w-8 h-8 border-3", lg: "w-12 h-12 border-4" };
  
  return (
    <div className={`${sizes[size]} rounded-full animate-spin ${mode === 'dark' ? "border-white/10 border-t-blue-500" : "border-gray-200 border-t-blue-500"}`} />
  );
};

const MockSkeleton = ({ className = "" }: { className?: string }) => {
  const { mode } = useTheme();
  return (
    <div className={`animate-pulse rounded-lg ${mode === 'dark' ? "bg-white/5" : "bg-gray-200"} ${className}`} />
  );
};

const MockPartsWidget = () => {
  const { mode } = useTheme();
  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative z-10">
        <GlassInput placeholder="Search parts..." defaultValue="Oil Filter" />
        <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        {/* Dropdown Simulation */}
        <div className={`absolute w-full mt-2 rounded-xl overflow-hidden shadow-xl border backdrop-blur-xl ${mode === 'dark' ? "bg-[#1A1A23]/95 border-white/10" : "bg-white/95 border-gray-200"}`}>
          <div className={`px-4 py-2 text-xs font-medium border-b ${mode === 'dark' ? "text-gray-500 border-white/5 bg-white/5" : "text-gray-500 border-gray-100 bg-gray-50"}`}>
            Suggestions
          </div>
          
          {/* Item 1 */}
          <div className={`px-4 py-3 cursor-pointer transition-colors border-b ${mode === 'dark' ? "hover:bg-white/5 border-white/5" : "hover:bg-gray-50 border-gray-100"}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Oil Filter Element</span>
                  <GlassBadge color="blue">Engine</GlassBadge>
                </div>
                <div className={`text-sm mt-1 flex items-center gap-2 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                  <span>Yanmar</span>
                  <span className="text-gray-600">•</span>
                  <span className="font-mono text-xs">119305-35151</span>
                </div>
              </div>
              <span className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>$18.50</span>
            </div>
          </div>

          {/* Item 2 */}
          <div className={`px-4 py-3 cursor-pointer transition-colors border-b ${mode === 'dark' ? "hover:bg-white/5 border-white/5" : "hover:bg-gray-50 border-gray-100"}`}>
             <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Fuel Filter</span>
                  <GlassBadge color="yellow">Fuel</GlassBadge>
                </div>
                <div className={`text-sm mt-1 flex items-center gap-2 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                  <span>Racor</span>
                  <span className="text-gray-600">•</span>
                  <span className="font-mono text-xs">2010PM-OR</span>
                </div>
              </div>
              <span className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>$12.99</span>
            </div>
          </div>

          {/* New Part Action */}
          <div className={`px-4 py-3 cursor-pointer transition-colors ${mode === 'dark' ? "bg-blue-500/10 hover:bg-blue-500/20" : "bg-blue-50 hover:bg-blue-100"}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${mode === 'dark' ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className={`font-medium ${mode === 'dark' ? "text-blue-400" : "text-blue-700"}`}>Add "Oil Filter" as new part</p>
                <p className={`text-xs ${mode === 'dark' ? "text-blue-300/60" : "text-blue-600/70"}`}>Enter details manually</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Loading State Demo */}
      <div className="pt-24 space-y-2">
         <p className={`text-xs uppercase tracking-wider font-medium ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>Loading State</p>
         <GlassCard className="p-4 flex items-center justify-center gap-3">
            <MockLoadingSpinner size="sm" />
            <span className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>Searching parts database...</span>
         </GlassCard>
      </div>
    </div>
  );
};

const MockMechanicCard = () => {
  const { mode } = useTheme();
  return (
    <GlassCard interactive className="group relative">
      <div className={`absolute top-0 left-0 w-full h-24 ${mode === 'dark' ? "bg-gradient-to-br from-blue-600/20 to-purple-600/20" : "bg-gradient-to-br from-blue-100 to-purple-100"}`} />
      <div className="p-6 relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center overflow-hidden shadow-lg ${mode === 'dark' ? "bg-gradient-to-br from-gray-700 to-gray-800 border-white/10" : "bg-white border-white"}`}>
               {/* Placeholder Avatar */}
               <Wrench className="w-6 h-6" />
          </div>
          <GlassBadge color="green">Available</GlassBadge>
        </div>
        
        <div className="mb-4">
          <h3 className={`text-xl font-bold mb-1 font-heading transition-colors ${mode === 'dark' ? "text-white group-hover:text-blue-400" : "text-gray-900 group-hover:text-blue-600"}`}>Elite Marine Services</h3>
          <p className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Miami, FL • Mobile Service</p>
        </div>
  
        <div className="flex items-center gap-4 mb-6 text-sm">
          <div className="flex items-center gap-1.5 text-yellow-400">
             <Star className="w-4 h-4 fill-current" />
             <span className="font-semibold">4.9</span>
             <span className={`text-gray-500 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>(128)</span>
          </div>
          <div className={`w-1 h-1 rounded-full ${mode === 'dark' ? "bg-gray-600" : "bg-gray-300"}`} />
          <div className={`${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>~15 min response</div>
        </div>
  
        <div className="flex flex-wrap gap-2 mb-6">
          {["Diesel Engines", "Electronics", "Hydraulics"].map((tag) => (
            <span key={tag} className={`px-2 py-1 rounded-md text-xs border ${mode === 'dark' ? "bg-white/5 border-white/5 text-gray-300" : "bg-gray-50 border-gray-100 text-gray-600"}`}>
              {tag}
            </span>
          ))}
        </div>
  
        <div className={`pt-4 border-t flex items-center justify-between text-xs ${mode === 'dark' ? "border-white/5 text-gray-400" : "border-gray-100 text-gray-500"}`}>
          <div className="flex items-center gap-2">
             <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Insured</span>
             <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Certified</span>
          </div>
          <span>150+ jobs</span>
        </div>
      </div>
    </GlassCard>
  );
};

const MockWorkOrderForm = () => {
  const { mode } = useTheme();
  return (
    <GlassCard className="max-w-xl mx-auto">
      <div className={`p-6 border-b ${mode === 'dark' ? "border-white/10" : "border-gray-100"}`}>
        <h2 className={`text-xl font-bold font-heading ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Request Service</h2>
        <p className={`text-sm mt-1 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Get a quote from Elite Marine Services</p>
      </div>
      
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <label className={`text-sm font-medium ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>Select Vessel</label>
          <GlassSelect>
            <option>Sea Ray Sundancer (2019)</option>
            <option>Boston Whaler (2021)</option>
          </GlassSelect>
        </div>
  
        <div className="space-y-2">
          <label className={`text-sm font-medium ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>Urgency</label>
          <div className="grid grid-cols-3 gap-3">
            {["Routine", "Soon", "Urgent"].map((opt) => (
              <button
                key={opt}
                className={`
                  px-4 py-3 rounded-xl border text-sm font-medium transition-all
                  ${opt === "Soon" 
                    ? (mode === 'dark' ? "bg-blue-500/20 border-blue-500/50 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700")
                    : (mode === 'dark' ? "bg-black/20 border-white/10 text-gray-400 hover:bg-white/5" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50")}
                `}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
  
        <div className="space-y-2">
          <label className={`text-sm font-medium ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}>Description</label>
          <textarea 
            rows={4}
            className={`
              w-full rounded-xl px-4 py-3 backdrop-blur-md focus:outline-none resize-none border
              ${mode === 'dark' 
                ? "bg-black/20 border-white/10 text-white placeholder-gray-500 focus:border-blue-500/50" 
                : "bg-white/50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white"}
            `}
            placeholder="Describe the issue..."
          />
        </div>
  
        <div className="pt-2 flex gap-3">
          <GlassButton variant="secondary" className="flex-1">Cancel</GlassButton>
          <GlassButton className="flex-1">Request Quote</GlassButton>
        </div>
      </div>
    </GlassCard>
  );
};

const MockDashboardStats = () => {
  const { mode } = useTheme();
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[
        { label: "Active Jobs", value: "3", change: "+1", color: "blue" },
        { label: "Pending Quotes", value: "5", change: "+2", color: "purple" },
        { label: "Total Spent", value: "$12.4k", change: "+15%", color: "green" },
      ].map((stat) => (
        <GlassCard key={stat.label} className="p-6 relative overflow-hidden">
          <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl ${mode === 'dark' ? `bg-${stat.color}-500/20` : `bg-${stat.color}-400/20`}`} />
          <p className={`text-sm mb-2 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>{stat.label}</p>
          <div className="flex items-baseline gap-3">
            <span className={`text-3xl font-bold font-heading ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{stat.value}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${mode === 'dark' ? "text-green-400 bg-green-500/10 border-green-500/20" : "text-green-700 bg-green-50 border-green-200"}`}>
              {stat.change}
            </span>
          </div>
        </GlassCard>
      ))}
    </div>
  );
};

// --- Main Content Component ---

const PageContent = () => {
  const { mode, toggleTheme } = useTheme();

  return (
    <div className={`${ubuntu.variable} ${inter.variable} font-inter min-h-screen transition-colors duration-500 ${mode === 'dark' ? "bg-[#0F0F13] text-white selection:bg-blue-500/30" : "bg-[#F3F4F6] text-gray-900 selection:bg-blue-200"}`}>
      
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
         <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] transition-colors duration-500 ${mode === 'dark' ? "bg-blue-600/10" : "bg-blue-400/20"}`} />
         <div className={`absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] rounded-full blur-[100px] transition-colors duration-500 ${mode === 'dark' ? "bg-purple-600/10" : "bg-purple-400/20"}`} />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-12 md:py-20 space-y-20 pb-40">
        
        {/* Header */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-6">
              <h1 className={`text-5xl md:text-7xl font-bold font-heading tracking-tight bg-clip-text text-transparent bg-gradient-to-r ${mode === 'dark' ? "from-white to-gray-500" : "from-gray-900 to-gray-500"}`}>
                Design System
              </h1>
              <p className={`text-xl max-w-2xl leading-relaxed ${mode === 'dark' ? "text-gray-400" : "text-gray-600"}`}>
                QR Captain Glass UI • A futuristic, glassmorphism-based design language optimized for high-end marine software interfaces.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleTheme}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all border ${mode === 'dark' ? "bg-white/5 border-white/10 hover:bg-white/10 text-gray-300" : "bg-white border-gray-200 hover:bg-gray-50 text-gray-600"}`}
              >
                {mode === 'dark' ? <span className="flex items-center gap-1.5"><Sun className="w-4 h-4" /> Light Mode</span> : <span className="flex items-center gap-1.5"><Moon className="w-4 h-4" /> Dark Mode</span>}
              </button>
              <GlassBadge>v1.1.0</GlassBadge>
            </div>
          </div>
        </div>

        {/* Colors */}
        <section className="space-y-8">
          <h2 className="text-2xl font-bold font-heading flex items-center gap-3">
            <span className="w-8 h-1 bg-blue-500 rounded-full" />
            Color Palette
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[
              { name: "Background", hex: "#0F0F13", class: "bg-[#0F0F13]" },
              { name: "Secondary", hex: "#1A1A23", class: "bg-[#1A1A23]" },
              { name: "Primary", hex: "#3B82F6", class: "bg-blue-500" },
              { name: "Success", hex: "#10B981", class: "bg-emerald-500" },
              { name: "Warning", hex: "#F59E0B", class: "bg-amber-500" },
              { name: "Error", hex: "#EF4444", class: "bg-red-500" },
            ].map((color) => (
              <GlassCard key={color.name} className="p-4 flex flex-col gap-3">
                <div className={`w-full aspect-video rounded-lg ${color.class} border shadow-inner ${mode === 'dark' ? "border-white/10" : "border-black/5"}`} />
                <div>
                  <p className={`font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>{color.name}</p>
                  <p className={`text-xs font-mono mt-1 ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>{color.hex}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Typography */}
        <section className="space-y-8">
          <h2 className="text-2xl font-bold font-heading flex items-center gap-3">
            <span className="w-8 h-1 bg-purple-500 rounded-full" />
            Typography
          </h2>
          <GlassCard className="p-8 space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className={`text-sm font-mono ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>Display / Ubuntu</p>
                  <h1 className={`text-4xl font-bold font-heading ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>The quick brown fox</h1>
                </div>
                <div className="space-y-2">
                  <p className={`text-sm font-mono ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>Heading 2 / Ubuntu</p>
                  <h2 className={`text-3xl font-bold font-heading ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Jumps over the lazy dog</h2>
                </div>
                <div className="space-y-2">
                   <p className={`text-sm font-mono ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>Heading 3 / Ubuntu</p>
                   <h3 className={`text-2xl font-medium font-heading ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Marine service simplified</h3>
                </div>
              </div>
              <div className="space-y-6">
                 <div className="space-y-2">
                    <p className={`text-sm font-mono ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>Body / Inter</p>
                    <p className={`text-base leading-relaxed ${mode === 'dark' ? "text-gray-300" : "text-gray-600"}`}>
                      Glassmorphism is a design style, coined by Michal Malewicz, that uses the properties of glass (transparency, blur) to create a sense of depth and hierarchy in the interface.
                    </p>
                 </div>
                 <div className="space-y-2">
                    <p className={`text-sm font-mono ${mode === 'dark' ? "text-gray-500" : "text-gray-400"}`}>Caption / Inter</p>
                    <p className={`text-xs uppercase tracking-wider font-medium ${mode === 'dark' ? "text-gray-500" : "text-gray-500"}`}>System Status: Operational</p>
                 </div>
              </div>
            </div>
          </GlassCard>
        </section>

        {/* Primitives */}
        <section className="space-y-8">
          <h2 className="text-2xl font-bold font-heading flex items-center gap-3">
            <span className="w-8 h-1 bg-emerald-500 rounded-full" />
            UI Primitives
          </h2>
          
          <div className="space-y-6">
            <h3 className={`text-lg font-medium ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Shadows & Depth</h3>
            <ShadowDemo />
          </div>

          <div className="grid md:grid-cols-2 gap-8">
             <GlassCard className="p-8 space-y-6">
               <h3 className={`text-lg font-medium mb-4 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Buttons</h3>
               <div className="flex flex-wrap gap-4">
                 <GlassButton>Primary Action</GlassButton>
                 <GlassButton variant="secondary">Secondary</GlassButton>
                 <GlassButton variant="ghost">Ghost</GlassButton>
               </div>
               <div className={`flex flex-wrap gap-4 pt-4 border-t ${mode === 'dark' ? "border-white/5" : "border-gray-100"}`}>
                  <GlassButton className="w-full">Full Width</GlassButton>
               </div>
             </GlassCard>

             <GlassCard className="p-8 space-y-6">
               <h3 className={`text-lg font-medium mb-4 ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Inputs</h3>
               <div className="space-y-4">
                 <GlassInput placeholder="Enter your email..." />
                 <GlassInput placeholder="Password" type="password" />
                 <GlassSelect>
                    <option>Option 1</option>
                    <option>Option 2</option>
                 </GlassSelect>
               </div>
             </GlassCard>
          </div>
        </section>

        {/* Application Components */}
        <section className="space-y-8">
          <h2 className="text-2xl font-bold font-heading flex items-center gap-3">
            <span className="w-8 h-1 bg-amber-500 rounded-full" />
            Component Showcase
          </h2>
          
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <h3 className={`font-mono text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Mechanic Card</h3>
              <MockMechanicCard />
              <div className="pt-8">
                 <h3 className={`font-mono text-sm mb-6 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Dashboard Widgets</h3>
                 <div className="flex flex-col gap-6">
                   <MockDashboardStats />
                 </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <h3 className={`font-mono text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Request Form</h3>
              <MockWorkOrderForm />

              <div className="pt-8">
                 <h3 className={`font-mono text-sm mb-6 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>Parts Widget & Loading States</h3>
                 <div className="grid md:grid-cols-2 gap-8">
                   <MockPartsWidget />
                   <div className="space-y-6">
                     <GlassCard className="p-6 space-y-4">
                        <div className="flex items-center gap-4">
                           <MockSkeleton className="w-12 h-12 rounded-full" />
                           <div className="space-y-2 flex-1">
                              <MockSkeleton className="h-4 w-3/4" />
                              <MockSkeleton className="h-3 w-1/2" />
                           </div>
                        </div>
                        <MockSkeleton className="h-24 w-full rounded-xl" />
                        <div className="flex gap-2">
                           <MockSkeleton className="h-8 w-20 rounded-full" />
                           <MockSkeleton className="h-8 w-20 rounded-full" />
                        </div>
                     </GlassCard>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

// --- Page Wrapper ---

export default function DesignSystemPage() {
  const [mode, setMode] = useState<ThemeMode>("dark");

  const toggleTheme = () => {
    setMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <PageContent />
    </ThemeContext.Provider>
  );
}
