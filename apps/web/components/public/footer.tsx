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
              href="/raffle"
              className="flex items-center gap-1.5 text-sm text-amber-400/70 hover:text-amber-300 transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 4a2 2 0 012-2h4l2 2h6a2 2 0 012 2v2H4V4z" opacity=".3" />
                <path d="M2 8h20v2H2V8zm1 3h18l-1.5 9a2 2 0 01-2 2H6.5a2 2 0 01-2-2L3 11zm5 2v5h2v-5H8zm3 0v5h2v-5h-2zm3 0v5h2v-5h-2z" />
              </svg>
              50/50 Raffle
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
