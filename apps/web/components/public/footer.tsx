"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative py-12 border-t border-white/[0.06]">
      <div className="max-w-[1200px] mx-auto px-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & tagline */}
          <div className="flex items-center gap-3">
            <img
              src="/qr-captain-logo.png"
              alt="QR Captain"
              className="h-7 w-7 brightness-0 invert opacity-50"
            />
            <div>
              <span className="text-white/50 font-heading font-medium text-sm">
                The QR Captain
              </span>
              <span className="text-white/20 mx-2">·</span>
              <span className="text-white/30 text-sm italic">
                Forged in Saltwater
              </span>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/donate"
              className="flex items-center gap-1.5 text-sm text-amber-400/70 hover:text-amber-300 transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              Donate
            </Link>
            {/* Hidden login link — dev only */}
            <Link
              href="/signin"
              className="text-sm text-transparent select-none"
              tabIndex={-1}
              aria-hidden="true"
            >
              Login
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-white/20 text-xs">
            &copy; {new Date().getFullYear()} The QR Captain. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
