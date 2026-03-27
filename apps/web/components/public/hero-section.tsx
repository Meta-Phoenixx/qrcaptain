"use client";

export function HeroSection() {
  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative pt-[140px] pb-24 md:pt-[180px] md:pb-32 overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[10%] left-[20%] w-[500px] h-[500px] rounded-full blur-[160px] opacity-30"
          style={{
            background: "radial-gradient(circle, #0ea5e9 0%, transparent 70%)",
            animation: "float 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute top-[30%] right-[10%] w-[400px] h-[400px] rounded-full blur-[140px] opacity-20"
          style={{
            background: "radial-gradient(circle, #0369a1 0%, transparent 70%)",
            animation: "float 10s ease-in-out infinite reverse",
          }}
        />
        <div
          className="absolute bottom-[10%] left-[40%] w-[300px] h-[300px] rounded-full blur-[120px] opacity-15"
          style={{
            background: "radial-gradient(circle, #38bdf8 0%, transparent 70%)",
            animation: "float 12s ease-in-out infinite 2s",
          }}
        />
      </div>

      <div className="relative z-10 max-w-[900px] mx-auto px-5 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-captain-500/30 bg-captain-500/10 mb-8">
          <span className="w-2 h-2 rounded-full bg-captain-400 animate-pulse" />
          <span className="text-sm text-captain-300 font-medium">
            Beta Program — Launching Q2 2026
          </span>
        </div>

        {/* Headline */}
        <h1
          className="font-heading font-bold text-white leading-[1.08] mb-6"
          style={{
            fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
            letterSpacing: "-0.03em",
          }}
        >
          Your Vessel&apos;s Complete{" "}
          <span className="bg-gradient-to-r from-captain-300 via-captain-400 to-captain-500 bg-clip-text text-transparent">
            Maintenance Record
          </span>
          .{" "}
          <br className="hidden sm:block" />
          Always On Board.
        </h1>

        {/* Subheadline */}
        <p
          className="text-white/60 max-w-[600px] mx-auto mb-10 font-inter"
          style={{ fontSize: "clamp(1rem, 2vw, 1.25rem)", lineHeight: 1.7 }}
        >
          QR Captain connects boat owners and marine mechanics through QR-coded
          vessel profiles, real-time work tracking, and verified maintenance
          history — so every service is documented, every part is traceable, and
          your vessel&apos;s story is never lost.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => scrollTo("#waitlist")}
            className="px-8 py-3.5 text-base font-semibold rounded-full bg-gradient-to-b from-captain-500 to-captain-600 text-white border border-captain-400/30 hover:from-captain-400 hover:to-captain-500 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-captain-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030014]"
            style={{
              boxShadow:
                "inset 0 1px 0 0 rgba(255,255,255,0.2), 0 0 30px rgba(14,165,233,0.2), 0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            Join the Waitlist
          </button>
          <button
            onClick={() => scrollTo("#features")}
            className="px-8 py-3.5 text-base font-medium rounded-full bg-white/[0.04] border border-white/[0.08] text-white/80 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.12] active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
          >
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}
