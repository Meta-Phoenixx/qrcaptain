"use client";

import { useTheme } from "../providers/theme-provider";

export const ThemeWrapper = ({ children }: { children: React.ReactNode }) => {
  const { mode } = useTheme();

  return (
    <div className={`font-inter min-h-screen transition-colors duration-500 ${mode === 'dark' ? "bg-[#0F0F13] text-white selection:bg-blue-500/30" : "bg-[#F3F4F6] text-gray-900 selection:bg-blue-200"}`}>
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
         <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] transition-colors duration-500 ${mode === 'dark' ? "bg-blue-600/10" : "bg-blue-400/20"}`} />
         <div className={`absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] rounded-full blur-[100px] transition-colors duration-500 ${mode === 'dark' ? "bg-purple-600/10" : "bg-purple-400/20"}`} />
      </div>

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
