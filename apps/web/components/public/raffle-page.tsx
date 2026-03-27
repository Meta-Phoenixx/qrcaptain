"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";

type TicketTier = "single" | "popular" | "value" | "bigdog";

const TIERS: {
  id: TicketTier;
  price: number;
  tickets: number;
  label: string;
  badge?: string;
}[] = [
  { id: "single", price: 5, tickets: 1, label: "$5" },
  { id: "popular", price: 20, tickets: 6, label: "$20", badge: "Most Popular" },
  { id: "value", price: 50, tickets: 15, label: "$50", badge: "Best Value" },
  { id: "bigdog", price: 100, tickets: 40, label: "$100", badge: "Big Dog Entry" },
];

const HOW_IT_WORKS = [
  "Register and select your ticket tier",
  "Pick up & purchase tickets at Captain\u2019s Meeting",
  "Fish the tournament \u2014 biggest trout wins",
  "Winner takes 50% of the pot",
  "Other 50% supports a worthy cause",
];

/* ─── Subcomponents ────────────────────────────────────────────── */

function LivePotCard({ stats }: { stats: { potTotal: number; totalEntries: number; totalTickets: number; winnerPot: number; causePot: number } | undefined }) {
  return (
    <div
      className="p-5 sm:p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] text-center"
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
    >
      <p className="text-xs sm:text-sm text-white/70 uppercase tracking-wider mb-1.5 sm:mb-2">Live Pot Total</p>
      <p className="font-heading font-bold text-3xl sm:text-4xl text-white mb-1">
        ${stats?.potTotal?.toLocaleString() ?? "0"}
      </p>
      <div className="flex items-center justify-center gap-4 mt-2 sm:mt-3 text-xs sm:text-sm text-white/60">
        <span>{stats?.totalEntries ?? 0} entries</span>
        <span className="w-px h-3 bg-white/20" />
        <span>{stats?.totalTickets ?? 0} tickets</span>
      </div>
      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/[0.08] grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs sm:text-sm text-white/70 mb-0.5 sm:mb-1">Winner Gets</p>
          <p className="font-heading font-bold text-captain-300 text-lg sm:text-xl">
            ${stats?.winnerPot?.toLocaleString() ?? "0"}
          </p>
        </div>
        <div>
          <p className="text-xs sm:text-sm text-white/70 mb-0.5 sm:mb-1">Goes to Cause</p>
          <p className="font-heading font-bold text-emerald-300 text-lg sm:text-xl">
            ${stats?.causePot?.toLocaleString() ?? "0"}
          </p>
        </div>
      </div>
    </div>
  );
}

function HowItWorksCard() {
  return (
    <div
      className="p-5 sm:p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]"
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
    >
      <h3 className="font-heading font-medium text-white text-base sm:text-lg mb-3 sm:mb-4">How It Works</h3>
      <div className="space-y-2.5 sm:space-y-3">
        {HOW_IT_WORKS.map((step, i) => (
          <div key={i} className="flex items-start gap-2.5 sm:gap-3">
            <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-captain-500/15 border border-captain-500/20 flex items-center justify-center text-captain-400 text-[10px] sm:text-xs font-bold shrink-0 mt-0.5">
              {i + 1}
            </span>
            <p className="text-white/50 text-sm sm:text-base" style={{ lineHeight: 1.6 }}>
              {step}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function GiveBackCard() {
  return (
    <div
      className="p-5 sm:p-6 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.03]"
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
    >
      <h3 className="font-heading font-medium text-emerald-400 text-base sm:text-lg mb-2 sm:mb-3">
        Give Back
      </h3>
      <p className="text-white/50 text-sm sm:text-base mb-2 sm:mb-3" style={{ lineHeight: 1.7 }}>
        Proceeds from this raffle support <strong className="text-white/70">Cass Walden</strong>,
        a student in the <strong className="text-white/70">Moody Aviation Program</strong>,
        training to become a missionary pilot serving remote and hard-to-reach regions around the world.
      </p>
      <p className="text-white/40 text-xs sm:text-sm" style={{ lineHeight: 1.6 }}>
        Through this 5-year program, Cass is being equipped to deliver disaster relief,
        medical supplies, and critical resources to communities that depend on aviation for survival.
        Your participation helps fund his continued training and mission.
      </p>
    </div>
  );
}

function ContactFooter() {
  return (
    <div className="text-center py-4 space-y-4">
      <p className="text-white/30 text-[10px] sm:text-xs uppercase tracking-wider">Hosted by</p>
      <div className="flex items-center justify-center gap-5 sm:gap-8">
        <a
          href="https://waldenmarine.com"
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-70 hover:opacity-100 transition-opacity duration-200"
        >
          <img
            src="/raffle/walden-marine-logo.png"
            alt="Walden Marine"
            className="h-10 sm:h-12 w-auto"
          />
        </a>
        <span className="text-white/15 text-lg">&amp;</span>
        <a href="/" className="opacity-70 hover:opacity-100 transition-opacity duration-200 flex items-center gap-2">
          <img
            src="/qr-captain-logo.png"
            alt="QR Captain"
            className="h-8 sm:h-10 w-auto brightness-0 invert"
          />
        </a>
      </div>
      <p className="text-white/40 text-xs sm:text-sm">
        <a href="tel:813-965-8711" className="hover:text-captain-400 transition-colors duration-200">813-965-8711</a>
        <span className="mx-2 text-white/20">&middot;</span>
        <a href="mailto:waldenmarine@gmail.com" className="hover:text-captain-400 transition-colors duration-200">waldenmarine@gmail.com</a>
      </p>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────── */

export function RafflePage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [selectedTier, setSelectedTier] = useState<TicketTier>("popular");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [result, setResult] = useState<{ ticketCount: number; amount: number } | null>(null);

  const submitEntry = useMutation(api.raffle.submitRaffleEntry);
  const stats = useQuery(api.raffle.getRaffleStats);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !email.trim()) return;

    setStatus("submitting");
    try {
      const res = await submitEntry({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        ticketTier: selectedTier,
      });
      if (res.success) {
        setResult({ ticketCount: res.ticketCount, amount: res.amount });
        setStatus("success");
      }
    } catch {
      setStatus("idle");
    }
  };

  return (
    <div
      className="min-h-screen font-inter text-white text-lg sm:text-base"
      style={{
        background: "linear-gradient(180deg, #030014 0%, #07192b 40%, #0a2540 70%, #030014 100%)",
      }}
    >
      {/* Override ThemeWrapper */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, #030014 0%, #07192b 40%, #0a2540 70%, #030014 100%)",
        }}
      />

      <div className="relative z-10">
        {/* ── Nav ── */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#030014]/80 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="max-w-[1296px] mx-auto px-4 sm:px-5 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/qr-captain-logo.png"
                alt="QR Captain"
                className="h-7 w-7 brightness-0 invert"
              />
              <span className="text-white/70 font-heading font-medium text-sm">QR Captain</span>
            </Link>
            <Link
              href="/"
              className="text-xs sm:text-sm text-white/50 hover:text-white/80 transition-colors duration-200"
            >
              Back to Home
            </Link>
          </div>
        </header>

        {/* ── Hero ── */}
        <section className="pt-[88px] pb-5 sm:pt-[100px] md:pt-[120px] md:pb-12 text-center px-4 sm:px-5">
          {/* Partnership logos */}
          <div className="flex flex-col items-center gap-2 sm:gap-3 mb-5 sm:mb-6">
            <span className="text-[10px] sm:text-xs text-white/30 uppercase tracking-wider">Presented by</span>
            <div className="flex items-center gap-4 sm:gap-6">
              <a href="https://waldenmarine.com" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity duration-200">
                <img src="/raffle/walden-marine-logo.png" alt="Walden Marine" className="h-10 sm:h-14 lg:h-16 w-auto" />
              </a>
              <span className="text-white/20 text-base sm:text-lg">&amp;</span>
              <a href="/" className="opacity-70 hover:opacity-100 transition-opacity duration-200">
                <img src="/qr-captain-logo.png" alt="QR Captain" className="h-9 sm:h-12 lg:h-14 w-auto brightness-0 invert" />
              </a>
            </div>
          </div>

          <h1
            className="font-heading font-bold text-white mb-2 sm:mb-3"
            style={{
              fontSize: "clamp(1.5rem, 5vw, 3.5rem)",
              letterSpacing: "-0.03em",
            }}
          >
            From the Water to a{" "}
            <span className="bg-gradient-to-r from-captain-300 via-captain-400 to-emerald-400 bg-clip-text text-transparent">
              Worthy Cause
            </span>
          </h1>
          <p className="text-white/50 text-sm sm:text-lg font-medium mb-1 sm:mb-2">
            Biggest Trout — 50/50 Raffle
          </p>
          <p className="text-captain-400 font-medium text-sm sm:text-base">
            Catch Big. Win Big. Give Back.
          </p>
        </section>

        {/* ── Content ── */}
        <div className="max-w-[1100px] mx-auto px-4 sm:px-5 pb-12 sm:pb-20">

          {/* ── MOBILE LAYOUT (< lg) ── */}
          <div className="lg:hidden space-y-5">
            {/* Live Pot — shown first on mobile */}
            <LivePotCard stats={stats} />

            {/* Event Info */}
            <div
              className="p-4 rounded-2xl border border-captain-500/20 bg-captain-500/5"
              style={{ boxShadow: "0 0 30px rgba(14,165,233,0.06)" }}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-captain-500/15 flex items-center justify-center text-captain-400 shrink-0 mt-0.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-heading font-medium text-sm sm:text-base mb-0.5">
                    Safety Harbor Slam — March 28-29, 2026
                  </p>
                  <p className="text-white/40 text-[11px] leading-relaxed">
                    Pick up &amp; purchase tickets at the <strong className="text-white/60">Captain&apos;s Meeting</strong> — Friday, March 27 at 6:30 PM at Backwater Provisions, Safety Harbor
                  </p>
                </div>
              </div>
            </div>

            {/* Ticket selection + form or success */}
            {status === "success" && result ? (
              <SuccessState result={result} />
            ) : (
              <>
                <TicketSelector selectedTier={selectedTier} onSelect={setSelectedTier} />
                <EntryForm
                  name={name} phone={phone} email={email}
                  setName={setName} setPhone={setPhone} setEmail={setEmail}
                  onSubmit={handleSubmit} submitting={status === "submitting"}
                />
              </>
            )}

            {/* How It Works */}
            <HowItWorksCard />

            {/* Give Back */}
            <GiveBackCard />

            {/* Flyer */}
            <div className="rounded-2xl overflow-hidden border border-white/[0.08]">
              <img
                src="/raffle/Water2WorthyCause-Flyer_v2.png"
                alt="Biggest Trout 50/50 Raffle Flyer"
                className="w-full h-auto"
              />
            </div>

            {/* Contact */}
            <ContactFooter />
          </div>

          {/* ── DESKTOP LAYOUT (>= lg) ── */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-8">
            {/* Left Column — Form */}
            <div>
              {/* Event Info */}
              <div
                className="p-5 rounded-2xl border border-captain-500/20 bg-captain-500/5 mb-6"
                style={{ boxShadow: "0 0 30px rgba(14,165,233,0.06)" }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-captain-500/15 flex items-center justify-center text-captain-400 shrink-0 mt-0.5">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-heading font-medium text-sm mb-1">
                      Safety Harbor Slam — March 28-29, 2026
                    </p>
                    <p className="text-white/40 text-xs leading-relaxed">
                      Pick up &amp; purchase tickets at the <strong className="text-white/60">Captain&apos;s Meeting</strong> — Friday, March 27 at 6:30 PM at Backwater Provisions, Safety Harbor
                    </p>
                  </div>
                </div>
              </div>

              {status === "success" && result ? (
                <SuccessState result={result} />
              ) : (
                <>
                  <TicketSelector selectedTier={selectedTier} onSelect={setSelectedTier} />
                  <EntryForm
                    name={name} phone={phone} email={email}
                    setName={setName} setPhone={setPhone} setEmail={setEmail}
                    onSubmit={handleSubmit} submitting={status === "submitting"}
                  />
                </>
              )}
            </div>

            {/* Right Column — Info */}
            <div className="space-y-6">
              <LivePotCard stats={stats} />
              <HowItWorksCard />
              <GiveBackCard />
            </div>
          </div>

          {/* Flyer + Footer — desktop only, centered below both columns */}
          <div className="hidden lg:flex mt-12 flex-col items-center">
            <div className="w-full max-w-[520px] rounded-2xl overflow-hidden border border-white/[0.08]">
              <img
                src="/raffle/Water2WorthyCause-Flyer_v2.png"
                alt="Biggest Trout 50/50 Raffle Flyer"
                className="w-full h-auto"
              />
            </div>
            <div className="mt-8 w-full">
              <ContactFooter />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ─── Shared sub-components ────────────────────────────────────── */

function TicketSelector({ selectedTier, onSelect }: { selectedTier: TicketTier; onSelect: (t: TicketTier) => void }) {
  return (
    <div className="mb-5 sm:mb-6">
      <h3 className="font-heading font-medium text-white text-sm sm:text-base mb-3 flex items-center gap-2">
        Select Your Tickets
      </h3>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {TIERS.map((tier) => (
          <button
            key={tier.id}
            type="button"
            onClick={() => onSelect(tier.id)}
            className={`relative pt-5 pb-3 sm:pt-5 sm:pb-4 px-3 sm:p-4 rounded-xl sm:rounded-2xl border text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-captain-400 ${
              selectedTier === tier.id
                ? "border-captain-400/50 bg-captain-500/10"
                : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
            }`}
            style={
              selectedTier === tier.id
                ? { boxShadow: "0 0 20px rgba(14,165,233,0.1), inset 0 1px 0 rgba(255,255,255,0.06)" }
                : { boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }
            }
          >
            {tier.badge && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-captain-500 text-[9px] sm:text-[10px] font-bold text-white whitespace-nowrap leading-tight">
                {tier.badge}
              </span>
            )}
            <p
              className={`font-heading font-bold text-xl sm:text-2xl mb-0.5 ${
                selectedTier === tier.id ? "text-captain-300" : "text-white"
              }`}
            >
              {tier.label}
            </p>
            <p className="text-white/40 text-[10px] sm:text-xs">
              {tier.tickets} Ticket{tier.tickets > 1 ? "s" : ""}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function EntryForm({
  name, phone, email, setName, setPhone, setEmail, onSubmit, submitting,
}: {
  name: string; phone: string; email: string;
  setName: (v: string) => void; setPhone: (v: string) => void; setEmail: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void; submitting: boolean;
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-3 sm:space-y-4 mb-5 sm:mb-6">
        <div>
          <label className="block text-sm sm:text-base font-medium text-white/60 mb-1 sm:mb-1.5">Full Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-white/30 focus:outline-none focus:border-captain-500/50 focus:ring-1 focus:ring-captain-500/50 transition-colors duration-200"
          />
        </div>
        <div>
          <label className="block text-sm sm:text-base font-medium text-white/60 mb-1 sm:mb-1.5">Phone Number</label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-white/30 focus:outline-none focus:border-captain-500/50 focus:ring-1 focus:ring-captain-500/50 transition-colors duration-200"
          />
        </div>
        <div>
          <label className="block text-sm sm:text-base font-medium text-white/60 mb-1 sm:mb-1.5">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-white/30 focus:outline-none focus:border-captain-500/50 focus:ring-1 focus:ring-captain-500/50 transition-colors duration-200"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full px-6 py-3 sm:py-3.5 text-sm sm:text-base font-semibold rounded-full bg-gradient-to-b from-captain-500 to-captain-600 text-white border border-captain-400/30 hover:from-captain-400 hover:to-captain-500 active:scale-[0.98] disabled:opacity-60 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-captain-400"
        style={{
          boxShadow:
            "inset 0 1px 0 0 rgba(255,255,255,0.2), 0 0 20px rgba(14,165,233,0.15)",
        }}
      >
        {submitting ? "Entering..." : "Enter the Raffle"}
      </button>
    </form>
  );
}

function SuccessState({ result }: { result: { ticketCount: number; amount: number } }) {
  return (
    <div className="p-6 sm:p-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-center">
      <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
        <svg className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h3 className="font-heading font-bold text-white text-lg sm:text-xl mb-2">
        You&apos;re In!
      </h3>
      <p className="text-white/60 text-sm sm:text-base mb-3 sm:mb-4">
        You selected <strong className="text-white">{result.ticketCount} ticket{result.ticketCount > 1 ? "s" : ""}</strong> (${result.amount}).
        Check your email for a confirmation.
      </p>
      <div className="p-3 sm:p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <p className="text-amber-300 text-sm sm:text-base font-medium">
          Remember: Pick up &amp; purchase your tickets at the Captain&apos;s Meeting
        </p>
        <p className="text-amber-300/70 text-[11px] sm:text-xs mt-1">
          Friday, March 27 at 6:30 PM — Backwater Provisions, Safety Harbor
        </p>
      </div>
    </div>
  );
}
