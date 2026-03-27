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
                QR Captain
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
              className="text-sm text-white/40 hover:text-white/70 transition-colors duration-200"
            >
              Raffle
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
            &copy; {new Date().getFullYear()} QR Captain. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
