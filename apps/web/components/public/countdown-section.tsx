"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";

// June 11, 2026 at midnight
const TARGET_DATE = new Date("2026-06-11T00:00:00");

function getTimeLeft() {
  const diff = TARGET_DATE.getTime() - Date.now();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
}

function AnimatedDigit({ value }: { value: number }) {
  return (
    <div className="relative h-[1em] w-[1.2em] overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {String(value).padStart(2, "0")}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
      <div className="relative flex items-center justify-center bg-captain-900/60 backdrop-blur-sm border border-captain-700/30 rounded-xl px-3 py-2.5 sm:px-5 sm:py-4 md:px-6 md:py-5 min-w-[60px] sm:min-w-[80px] md:min-w-[100px] overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-b from-captain-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <span className="font-mono text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-white">
          <AnimatedDigit value={value} />
        </span>
      </div>
      <span className="text-[9px] sm:text-[10px] md:text-xs font-medium uppercase tracking-[0.2em] text-captain-300/60">
        {label}
      </span>
    </div>
  );
}

function Separator() {
  return (
    <div className="flex flex-col items-center justify-center pb-5 sm:pb-6">
      <span className="text-xl sm:text-2xl md:text-4xl font-light text-captain-400/40 animate-pulse">
        :
      </span>
    </div>
  );
}

export function CountdownSection() {
  const [time, setTime] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTime(getTimeLeft());
    const interval = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(interval);
  }, []);

  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  if (!mounted) return null;

  return (
    <section className="relative w-full px-4 sm:px-5 py-16 md:py-24 overflow-hidden flex items-center justify-center">
      {/* Glow animation styles */}
      <style jsx>{`
        @property --glow-hue {
          syntax: "<number>";
          inherits: true;
          initial-value: 0;
        }
        @property --glow-rotate {
          syntax: "<number>";
          inherits: true;
          initial-value: 0;
        }
        @property --glow-bg-x {
          syntax: "<number>";
          inherits: true;
          initial-value: 0;
        }
        @property --glow-bg-y {
          syntax: "<number>";
          inherits: true;
          initial-value: 0;
        }

        .countdown-glow-wrap {
          position: relative;
          z-index: 2;
          border-radius: 1.5rem;
        }

        .countdown-glow-wrap:before,
        .countdown-glow-wrap:after {
          content: "";
          display: block;
          position: absolute;
          border-radius: 1.5rem;
        }

        /* Rotating glow orb — hidden on mobile */
        .glow-orb {
          display: none;
          position: absolute;
          width: 120px;
          height: 120px;
          animation: countdown-rotate 6s linear infinite;
          transform: rotateZ(calc(var(--glow-rotate) * 1deg));
          transform-origin: center;
          border-radius: 9999px;
          pointer-events: none;
          z-index: 0;
        }

        .glow-orb:after {
          content: "";
          display: block;
          z-index: -2;
          filter: blur(60px);
          width: 200%;
          height: 200%;
          left: -50%;
          top: -50%;
          background: #8B5CF6;
          position: relative;
          border-radius: 9999px;
          animation: countdown-hue 6s linear infinite;
          transform: scaleY(1.8) scaleX(2.2);
          opacity: 0.5;
        }

        @media (min-width: 768px) {
          .glow-orb {
            display: block;
          }
        }

        /* Card border glow */
        .countdown-card-border {
          position: absolute;
          width: calc(100% + 3px);
          height: calc(100% + 3px);
          left: -1.5px;
          top: -1.5px;
          border-radius: 1.5rem;
          z-index: -1;
          background: #120a2e radial-gradient(
            30% 30% at calc(var(--glow-bg-x) * 1%) calc(var(--glow-bg-y) * 1%),
            rgba(139, 92, 246, 0.7) 0%,
            rgba(139, 92, 246, 0.4) 30%,
            rgba(139, 92, 246, 0.15) 60%,
            transparent 100%
          );
          animation: countdown-border-move 6s linear infinite;
          mix-blend-mode: screen;
        }

        @keyframes countdown-rotate {
          from {
            --glow-rotate: -70;
          }
          to {
            --glow-rotate: 290;
          }
        }

        @keyframes countdown-hue {
          0% {
            background: #8B5CF6;
          }
          33% {
            background: #7C3AED;
          }
          66% {
            background: #A78BFA;
          }
          100% {
            background: #8B5CF6;
          }
        }

        @keyframes countdown-border-move {
          0% {
            --glow-bg-x: 0;
            --glow-bg-y: 0;
          }
          25% {
            --glow-bg-x: 100;
            --glow-bg-y: 0;
          }
          50% {
            --glow-bg-x: 100;
            --glow-bg-y: 100;
          }
          75% {
            --glow-bg-x: 0;
            --glow-bg-y: 100;
          }
          100% {
            --glow-bg-x: 0;
            --glow-bg-y: 0;
          }
        }
      `}</style>

      {/* Divider */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* Background glow — desktop only */}
      <div className="hidden md:block absolute inset-0 pointer-events-none">
        <div
          className="absolute w-[700px] h-[500px] rounded-full blur-[160px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative w-full max-w-[900px] mx-auto">
        {/* Glow wrapper */}
        <div className="countdown-glow-wrap">
          {/* Rotating glow orb */}
          <span className="glow-orb" />

          {/* Animated border */}
          <div className="countdown-card-border" />

          {/* Card content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative rounded-3xl bg-[#120a2e] p-6 sm:p-8 md:p-16 flex flex-col items-center gap-6 sm:gap-8 md:gap-12 text-center overflow-hidden"
          >
            {/* Inner purple gradient */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.06) 0%, transparent 50%)",
              }}
            />

            <div className="flex flex-col items-center gap-3 sm:gap-4 relative z-10">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs sm:text-sm font-medium text-violet-300"
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <span>Early Access Opening Soon</span>
              </motion.div>

              <h2
                className="font-heading font-bold text-white"
                style={{
                  fontSize: "clamp(1.75rem, 4vw, 3.5rem)",
                  letterSpacing: "-0.03em",
                }}
              >
                Launching Soon
              </h2>

              <p className="text-white/50 text-sm sm:text-base md:text-lg max-w-xl" style={{ lineHeight: 1.7 }}>
                Be among the first to experience The QR Captain. Reserve your spot
                before the countdown ends.
              </p>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 relative z-10">
              <TimeUnit value={time?.days ?? 0} label="Days" />
              <Separator />
              <TimeUnit value={time?.hours ?? 0} label="Hours" />
              <Separator />
              <TimeUnit value={time?.minutes ?? 0} label="Minutes" />
              <Separator />
              <TimeUnit value={time?.seconds ?? 0} label="Seconds" />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="relative z-10"
            >
              <button
                onClick={() => scrollTo("#waitlist")}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-b from-captain-500 to-captain-600 text-white font-semibold border border-captain-400/30 hover:from-captain-400 hover:to-captain-500 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-captain-400"
                style={{
                  boxShadow:
                    "inset 0 1px 0 0 rgba(255,255,255,0.2), 0 0 30px rgba(14,165,233,0.2)",
                }}
              >
                <span>Get Notified</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
