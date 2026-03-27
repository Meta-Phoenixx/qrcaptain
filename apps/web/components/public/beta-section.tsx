"use client";

const BETA_PERKS = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
    title: "Early Access",
    description: "Be the first to use The QR Captain before public launch.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
    title: "Shape the Product",
    description: "Direct line to the team. Your feedback drives what we build.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-5.54 0" />
      </svg>
    ),
    title: "Founding Member",
    description: "Permanent founding member badge and priority support forever.",
  },
];

export function BetaSection() {
  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="beta" className="relative py-20 md:py-28">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="max-w-[900px] mx-auto px-5">
        <div className="relative p-8 md:p-12 rounded-3xl border border-captain-500/15 overflow-hidden">
          {/* Background glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(14,165,233,0.08) 0%, transparent 60%)",
            }}
          />

          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-captain-400/30 bg-captain-500/10 mb-6">
              <span className="text-sm text-captain-300 font-medium">
                Q2 2026
              </span>
            </div>

            <h2
              className="font-heading font-bold text-white mb-4"
              style={{
                fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                letterSpacing: "-0.03em",
              }}
            >
              Beta Program
            </h2>
            <p className="text-white/50 text-base max-w-[500px] mx-auto mb-10" style={{ lineHeight: 1.7 }}>
              We&apos;re looking for passionate boaters and mechanics to be our founding crew.
              Help shape The QR Captain from the inside and get a head start on the platform.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              {BETA_PERKS.map((perk, i) => (
                <div key={i} className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="w-9 h-9 rounded-lg bg-captain-500/10 flex items-center justify-center text-captain-400 mx-auto mb-3">
                    {perk.icon}
                  </div>
                  <h3 className="font-heading font-medium text-white text-base mb-1">
                    {perk.title}
                  </h3>
                  <p className="text-white/40 text-sm" style={{ lineHeight: 1.6 }}>
                    {perk.description}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => scrollTo("#waitlist")}
              className="px-8 py-3.5 text-base font-semibold rounded-full bg-gradient-to-b from-captain-500 to-captain-600 text-white border border-captain-400/30 hover:from-captain-400 hover:to-captain-500 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-captain-400"
              style={{
                boxShadow:
                  "inset 0 1px 0 0 rgba(255,255,255,0.2), 0 0 30px rgba(14,165,233,0.2)",
              }}
            >
              Apply for Beta Access
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
