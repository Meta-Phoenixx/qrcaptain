"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

type RoleInterest = "owner" | "mechanic" | "both";

export function WaitlistSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleInterest, setRoleInterest] = useState<RoleInterest>("owner");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "duplicate">("idle");

  const submitSignup = useMutation(api.waitlist.submitWaitlistSignup);
  const waitlistCount = useQuery(api.waitlist.getWaitlistCount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setStatus("submitting");
    try {
      const result = await submitSignup({
        name: name.trim(),
        email: email.trim(),
        roleInterest,
        source: "landing_page",
      });

      if (result.success) {
        setStatus("success");
      } else if (result.error === "already_registered") {
        setStatus("duplicate");
      }
    } catch {
      setStatus("idle");
    }
  };

  return (
    <section id="waitlist" className="relative py-20 md:py-28">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="max-w-[560px] mx-auto px-5">
        <div className="text-center mb-10">
          <h2
            className="font-heading font-bold text-white mb-4"
            style={{
              fontSize: "clamp(1.75rem, 4vw, 3rem)",
              letterSpacing: "-0.03em",
            }}
          >
            Be First On Board
          </h2>
          <p className="text-white/50 text-base" style={{ lineHeight: 1.7 }}>
            Join the waitlist to get priority access when QR Captain launches.
            Early adopters get founding member status.
          </p>
        </div>

        {status === "success" ? (
          <div className="text-center p-8 rounded-2xl border border-captain-500/20 bg-captain-500/5">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-captain-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-captain-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="font-heading font-bold text-white text-xl mb-2">
              You&apos;re on the list!
            </h3>
            <p className="text-white/50 text-base">
              Check your email for a confirmation. We&apos;ll notify you when the Beta Program opens in Q2 2026.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-6 md:p-8 rounded-2xl border border-white/[0.08] bg-white/[0.02]"
            style={{
              boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
            }}
          >
            {/* Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-white/60 mb-1.5">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/30 focus:outline-none focus:border-captain-500/50 focus:ring-1 focus:ring-captain-500/50 transition-colors duration-200"
              />
            </div>

            {/* Email */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-white/60 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/30 focus:outline-none focus:border-captain-500/50 focus:ring-1 focus:ring-captain-500/50 transition-colors duration-200"
              />
            </div>

            {/* Role Interest */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-white/60 mb-2">I am a...</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "owner", label: "Boat Owner" },
                  { value: "mechanic", label: "Mechanic" },
                  { value: "both", label: "Both" },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRoleInterest(option.value)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-captain-400 ${
                      roleInterest === option.value
                        ? "bg-captain-500/15 border-captain-500/40 text-captain-300"
                        : "bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white/70 hover:border-white/[0.1]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {status === "duplicate" && (
              <p className="text-amber-400 text-sm mb-4 text-center">
                This email is already on the waitlist!
              </p>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full px-6 py-3.5 text-base font-semibold rounded-full bg-gradient-to-b from-captain-500 to-captain-600 text-white border border-captain-400/30 hover:from-captain-400 hover:to-captain-500 active:scale-[0.98] disabled:opacity-60 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-captain-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030014]"
              style={{
                boxShadow:
                  "inset 0 1px 0 0 rgba(255,255,255,0.2), 0 0 20px rgba(14,165,233,0.15)",
              }}
            >
              {status === "submitting" ? "Joining..." : "Join the Waitlist"}
            </button>

            {waitlistCount !== undefined && waitlistCount > 0 && (
              <p className="text-center text-white/30 text-sm mt-4">
                {waitlistCount.toLocaleString()} {waitlistCount === 1 ? "person has" : "people have"} already joined
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
