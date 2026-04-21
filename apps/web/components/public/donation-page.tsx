"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";

const PRESETS = [
  { amount: 25, label: "$25" },
  { amount: 50, label: "$50", badge: "Most Popular" },
  { amount: 100, label: "$100", badge: "Best Value" },
  { amount: 250, label: "$250", badge: "Champion" },
];

/* ─── Subcomponents ────────────────────────────────────────────── */

function DonationTally({ stats }: { stats: { totalRaised: number; donorCount: number } | undefined }) {
  return (
    <div
      className="p-5 sm:p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] text-center"
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
    >
      <p className="text-xs sm:text-sm text-white/70 uppercase tracking-wider mb-1.5 sm:mb-2">Total Raised</p>
      <p className="font-heading font-bold text-3xl sm:text-4xl text-white mb-1">
        ${stats?.totalRaised?.toLocaleString() ?? "0"}
      </p>
      <div className="flex items-center justify-center gap-4 mt-2 sm:mt-3 text-xs sm:text-sm text-white/60">
        <span>{stats?.donorCount ?? 0} donor{(stats?.donorCount ?? 0) !== 1 ? "s" : ""}</span>
      </div>
      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/[0.08]">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs sm:text-sm text-white/70 mb-0.5">90% to Cause</p>
            <p className="text-emerald-300/80 text-xs sm:text-sm font-medium">Cass Walden&apos;s Training</p>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-white/70 mb-0.5">10% to Platform</p>
            <p className="text-captain-300/80 text-xs sm:text-sm font-medium">The QR Captain Development</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AboutCauseCard() {
  return (
    <div
      className="p-5 sm:p-6 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.03]"
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
    >
      <h3 className="font-heading font-medium text-emerald-400 text-base sm:text-lg mb-2 sm:mb-3">
        About the Cause
      </h3>
      <p className="text-white/50 text-sm sm:text-base mb-2 sm:mb-3" style={{ lineHeight: 1.7 }}>
        Your donation supports <strong className="text-white/70">Cass Walden</strong>, who is training to become a missionary
        pilot serving remote and hard-to-reach regions around the world.
      </p>
      <p className="text-white/40 text-xs sm:text-sm" style={{ lineHeight: 1.6 }}>
        Through this 5-year program, Cass is being equipped to deliver disaster relief,
        medical supplies, and critical resources to communities that depend on aviation for survival.
      </p>
    </div>
  );
}

function VipAccessCard() {
  return (
    <div
      className="p-5 sm:p-6 rounded-2xl border border-captain-500/20 bg-captain-500/5"
      style={{ boxShadow: "0 0 20px rgba(14,165,233,0.06)" }}
    >
      <h3 className="font-heading font-medium text-captain-300 text-base sm:text-lg mb-2">
        Donate &amp; Get VIP Access
      </h3>
      <p className="text-white/50 text-sm sm:text-base" style={{ lineHeight: 1.7 }}>
        Every donor receives <strong className="text-white/70">free VIP access</strong> to
        The QR Captain community when the platform launches. Be part of the founding crew!
      </p>
    </div>
  );
}

function DonationFooter() {
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
          <img src="/raffle/walden-marine-logo.png" alt="Walden Marine" className="h-10 sm:h-12 w-auto" />
        </a>
        <span className="text-white/15 text-lg">&amp;</span>
        <a href="/" className="opacity-70 hover:opacity-100 transition-opacity duration-200">
          <img src="/qr-captain-logo.png" alt="The QR Captain" className="h-8 sm:h-10 w-auto brightness-0 invert" />
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

export function DonationPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [donatedAmount, setDonatedAmount] = useState(0);

  const submitDonation = useMutation(api.donations.submitDonation);
  const stats = useQuery(api.donations.getDonationStats);

  const finalAmount = isCustom ? (parseFloat(customAmount) || 0) : selectedAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || finalAmount <= 0) return;

    setStatus("submitting");
    try {
      const res = await submitDonation({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        amount: finalAmount,
        customAmount: isCustom,
        message: message.trim() || undefined,
      });
      if (res.success) {
        setDonatedAmount(res.amount ?? finalAmount);
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
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, #030014 0%, #07192b 40%, #0a2540 70%, #030014 100%)",
        }}
      />

      <div className="relative z-10">
        {/* Nav */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#030014]/80 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="max-w-[1296px] mx-auto px-4 sm:px-5 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <img src="/qr-captain-logo.png" alt="The QR Captain" className="h-7 w-7 brightness-0 invert" />
              <span className="text-white/70 font-heading font-medium text-sm">The QR Captain</span>
            </Link>
            <Link href="/" className="text-xs sm:text-sm text-white/50 hover:text-white/80 transition-colors duration-200">
              Back to Home
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="pt-[88px] pb-5 sm:pt-[100px] md:pt-[120px] md:pb-12 text-center px-4 sm:px-5">
          <div className="flex flex-col items-center gap-2 sm:gap-3 mb-5 sm:mb-6">
            <span className="text-[10px] sm:text-xs text-white/30 uppercase tracking-wider">Presented by</span>
            <div className="flex items-center gap-4 sm:gap-6">
              <a href="https://waldenmarine.com" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity duration-200">
                <img src="/raffle/walden-marine-logo.png" alt="Walden Marine" className="h-10 sm:h-14 lg:h-16 w-auto" />
              </a>
              <span className="text-white/20 text-base sm:text-lg">&amp;</span>
              <a href="/" className="opacity-70 hover:opacity-100 transition-opacity duration-200">
                <img src="/qr-captain-logo.png" alt="The QR Captain" className="h-9 sm:h-12 lg:h-14 w-auto brightness-0 invert" />
              </a>
            </div>
          </div>

          <h1
            className="font-heading font-bold text-white mb-2 sm:mb-3"
            style={{ fontSize: "clamp(1.5rem, 5vw, 3.5rem)", letterSpacing: "-0.03em" }}
          >
            From the Water to a{" "}
            <span className="bg-gradient-to-r from-captain-300 via-captain-400 to-emerald-400 bg-clip-text text-transparent">
              Worthy Cause
            </span>
          </h1>
          <p className="text-white/50 text-sm sm:text-lg font-medium mb-1 sm:mb-2">
            Support Cass Walden&apos;s Missionary Aviation Training
          </p>
          <p className="text-captain-400 font-medium text-xs sm:text-sm">
            Donate Today. Make an Impact.
          </p>
        </section>

        {/* Content */}
        <div className="max-w-[1100px] mx-auto px-4 sm:px-5 pb-12 sm:pb-20">

          {/* ── MOBILE (< lg) ── */}
          <div className="lg:hidden space-y-5">
            <DonationTally stats={stats} />

            {status === "success" ? (
              <SuccessState amount={donatedAmount} />
            ) : (
              <>
                <AmountSelector
                  selectedAmount={selectedAmount}
                  isCustom={isCustom}
                  customAmount={customAmount}
                  onSelectPreset={(amt) => { setSelectedAmount(amt); setIsCustom(false); }}
                  onCustomChange={(val) => { setCustomAmount(val); setIsCustom(true); }}
                />
                <DonorForm
                  name={name} email={email} phone={phone} message={message}
                  setName={setName} setEmail={setEmail} setPhone={setPhone} setMessage={setMessage}
                  onSubmit={handleSubmit} submitting={status === "submitting"} amount={finalAmount}
                />
              </>
            )}

            <VipAccessCard />
            <AboutCauseCard />

            <div className="rounded-2xl overflow-hidden border border-white/[0.08]">
              <img src="/donate/donation-flyer.jpg" alt="Donation Flyer" className="w-full h-auto" />
            </div>

            <DonationFooter />
          </div>

          {/* ── DESKTOP (>= lg) ── */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-8">
            <div>
              {status === "success" ? (
                <SuccessState amount={donatedAmount} />
              ) : (
                <>
                  <AmountSelector
                    selectedAmount={selectedAmount}
                    isCustom={isCustom}
                    customAmount={customAmount}
                    onSelectPreset={(amt) => { setSelectedAmount(amt); setIsCustom(false); }}
                    onCustomChange={(val) => { setCustomAmount(val); setIsCustom(true); }}
                  />
                  <DonorForm
                    name={name} email={email} phone={phone} message={message}
                    setName={setName} setEmail={setEmail} setPhone={setPhone} setMessage={setMessage}
                    onSubmit={handleSubmit} submitting={status === "submitting"} amount={finalAmount}
                  />
                </>
              )}
            </div>

            <div className="space-y-6">
              <DonationTally stats={stats} />
              <VipAccessCard />
              <AboutCauseCard />
            </div>
          </div>

          {/* Flyer + Footer — desktop only, centered */}
          <div className="hidden lg:flex mt-12 flex-col items-center">
            <div className="w-full max-w-[520px] rounded-2xl overflow-hidden border border-white/[0.08]">
              <img src="/donate/donation-flyer.jpg" alt="Donation Flyer" className="w-full h-auto" />
            </div>
            <div className="mt-8 w-full">
              <DonationFooter />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Shared sub-components ────────────────────────────────────── */

function AmountSelector({
  selectedAmount, isCustom, customAmount, onSelectPreset, onCustomChange,
}: {
  selectedAmount: number; isCustom: boolean; customAmount: string;
  onSelectPreset: (amt: number) => void; onCustomChange: (val: string) => void;
}) {
  return (
    <div className="mb-5 sm:mb-6">
      <h3 className="font-heading font-medium text-white text-sm sm:text-base mb-3">
        Select Donation Amount
      </h3>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-3">
        {PRESETS.map((preset) => (
          <button
            key={preset.amount}
            type="button"
            onClick={() => onSelectPreset(preset.amount)}
            className={`relative pt-5 pb-3 sm:pt-5 sm:pb-4 px-3 sm:p-4 rounded-xl sm:rounded-2xl border text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-captain-400 ${
              !isCustom && selectedAmount === preset.amount
                ? "border-captain-400/50 bg-captain-500/10"
                : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
            }`}
            style={
              !isCustom && selectedAmount === preset.amount
                ? { boxShadow: "0 0 20px rgba(14,165,233,0.1), inset 0 1px 0 rgba(255,255,255,0.06)" }
                : { boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }
            }
          >
            {preset.badge && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-captain-500 text-[9px] sm:text-[10px] font-bold text-white whitespace-nowrap leading-tight">
                {preset.badge}
              </span>
            )}
            <p className={`font-heading font-bold text-xl sm:text-2xl mb-0.5 ${
              !isCustom && selectedAmount === preset.amount ? "text-captain-300" : "text-white"
            }`}>
              {preset.label}
            </p>
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div
        className={`rounded-xl sm:rounded-2xl border p-3 sm:p-4 transition-all duration-200 ${
          isCustom
            ? "border-captain-400/50 bg-captain-500/10"
            : "border-white/[0.08] bg-white/[0.02]"
        }`}
      >
        <label className="block text-xs sm:text-sm font-medium text-white/60 mb-1.5">Other Amount</label>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-lg font-medium">$</span>
          <input
            type="number"
            min="1"
            step="1"
            value={customAmount}
            onChange={(e) => onCustomChange(e.target.value)}
            onFocus={() => onCustomChange(customAmount || "")}
            placeholder="Enter amount"
            className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-white/30 focus:outline-none focus:border-captain-500/50 focus:ring-1 focus:ring-captain-500/50 transition-colors duration-200"
          />
        </div>
      </div>
    </div>
  );
}

function DonorForm({
  name, email, phone, message, setName, setEmail, setPhone, setMessage, onSubmit, submitting, amount,
}: {
  name: string; email: string; phone: string; message: string;
  setName: (v: string) => void; setEmail: (v: string) => void;
  setPhone: (v: string) => void; setMessage: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void; submitting: boolean; amount: number;
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-3 sm:space-y-4 mb-5 sm:mb-6">
        <div>
          <label className="block text-sm sm:text-base font-medium text-white/60 mb-1 sm:mb-1.5">Full Name *</label>
          <input
            type="text" required value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-white/30 focus:outline-none focus:border-captain-500/50 focus:ring-1 focus:ring-captain-500/50 transition-colors duration-200"
          />
        </div>
        <div>
          <label className="block text-sm sm:text-base font-medium text-white/60 mb-1 sm:mb-1.5">Email Address *</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-white/30 focus:outline-none focus:border-captain-500/50 focus:ring-1 focus:ring-captain-500/50 transition-colors duration-200"
          />
        </div>
        <div>
          <label className="block text-sm sm:text-base font-medium text-white/60 mb-1 sm:mb-1.5">Phone (optional)</label>
          <input
            type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-white/30 focus:outline-none focus:border-captain-500/50 focus:ring-1 focus:ring-captain-500/50 transition-colors duration-200"
          />
        </div>
        <div>
          <label className="block text-sm sm:text-base font-medium text-white/60 mb-1 sm:mb-1.5">Message (optional)</label>
          <textarea
            value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder="Leave a message of support..."
            rows={2}
            className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-white/30 focus:outline-none focus:border-captain-500/50 focus:ring-1 focus:ring-captain-500/50 transition-colors duration-200 resize-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || amount <= 0}
        className="w-full px-6 py-3 sm:py-3.5 text-sm sm:text-base font-semibold rounded-full bg-gradient-to-b from-captain-500 to-captain-600 text-white border border-captain-400/30 hover:from-captain-400 hover:to-captain-500 active:scale-[0.98] disabled:opacity-60 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-captain-400"
        style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.2), 0 0 20px rgba(14,165,233,0.15)" }}
      >
        {submitting ? "Processing..." : `Donate $${amount > 0 ? amount.toLocaleString() : "0"}`}
      </button>
    </form>
  );
}

function SuccessState({ amount }: { amount: number }) {
  return (
    <div className="p-6 sm:p-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-center">
      <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
        <svg className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h3 className="font-heading font-bold text-white text-lg sm:text-xl mb-2">
        Thank You!
      </h3>
      <p className="text-white/60 text-sm sm:text-base mb-3 sm:mb-4">
        Your donation of <strong className="text-white">${amount.toLocaleString()}</strong> is making a real difference.
        Check your email for a confirmation.
      </p>
      <div className="p-3 sm:p-4 rounded-xl bg-captain-500/10 border border-captain-500/20">
        <p className="text-captain-300 text-sm sm:text-base font-medium">
          You&apos;ll receive free VIP access to The QR Captain community!
        </p>
        <p className="text-captain-300/70 text-[11px] sm:text-xs mt-1">
          We&apos;ll be in touch with your access details when the platform launches.
        </p>
      </div>
    </div>
  );
}
