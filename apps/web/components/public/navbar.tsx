"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "For Owners", href: "#owners" },
  { label: "For Mechanics", href: "#mechanics" },
  { label: "Beta Program", href: "#beta" },
];

function RaffleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M4 4a2 2 0 012-2h4l2 2h6a2 2 0 012 2v2H4V4z" opacity=".3" />
      <path d="M2 8h20v2H2V8zm1 3h18l-1.5 9a2 2 0 01-2 2H6.5a2 2 0 01-2-2L3 11zm5 2v5h2v-5H8zm3 0v5h2v-5h-2zm3 0v5h2v-5h-2z" />
    </svg>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      )}
    </svg>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#030014]/80 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1296px] mx-auto px-5 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <img
            src="/qr-captain-logo.png"
            alt="QR Captain"
            className="h-8 w-8 brightness-0 invert transition-transform duration-300 group-hover:scale-110"
          />
          <span className="text-white font-heading font-bold text-lg tracking-tight">
            The QR Captain
          </span>
        </Link>

        {/* Center Nav — Desktop */}
        <nav className="hidden md:flex items-center bg-white/[0.04] border border-white/[0.06] rounded-full px-1.5 py-1">
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="px-4 py-1.5 text-sm text-white/70 hover:text-white rounded-full transition-colors duration-200 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-captain-400"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Right — Desktop */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/raffle"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-300 text-sm font-semibold hover:bg-amber-400/20 hover:border-amber-400/50 hover:text-amber-200 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            style={{ boxShadow: "0 0 12px rgba(251,191,36,0.1)" }}
          >
            <RaffleIcon className="w-4 h-4" />
            50/50 Raffle
          </Link>
          {/* Hidden login — dev only */}
          <Link
            href="/signin"
            className="text-sm text-transparent select-none pointer-events-auto hover:text-transparent focus-visible:outline-none rounded px-2 py-1"
            tabIndex={-1}
            aria-hidden="true"
          >
            Login
          </Link>
          <button
            onClick={() => scrollTo("#waitlist")}
            className="px-5 py-2 text-sm font-medium rounded-full bg-gradient-to-b from-captain-500 to-captain-600 text-white border border-captain-400/30 hover:from-captain-400 hover:to-captain-500 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-captain-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030014]"
            style={{
              boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.2), 0 0 20px rgba(14,165,233,0.15)",
            }}
          >
            Join Waitlist
          </button>
        </div>

        {/* Mobile — Raffle link (always visible) + Hamburger */}
        <div className="md:hidden flex items-center gap-2">
          <Link
            href="/raffle"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-300 text-xs font-semibold hover:bg-amber-400/20 active:scale-95 transition-all duration-200"
            style={{ boxShadow: "0 0 10px rgba(251,191,36,0.08)" }}
          >
            <RaffleIcon className="w-3.5 h-3.5" />
            50/50 Raffle
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-white/70 hover:text-white p-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-captain-400 rounded"
            aria-label="Toggle menu"
          >
            <HamburgerIcon open={mobileOpen} />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#030014]/95 backdrop-blur-xl border-t border-white/[0.06] pb-6">
          <nav className="flex flex-col px-5 pt-4 gap-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="text-left px-4 py-3 text-white/70 hover:text-white hover:bg-white/[0.04] rounded-xl transition-colors duration-200"
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => scrollTo("#waitlist")}
              className="mt-2 px-5 py-3 text-sm font-medium rounded-full bg-gradient-to-b from-captain-500 to-captain-600 text-white border border-captain-400/30 active:scale-95 transition-all duration-200"
            >
              Join Waitlist
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
