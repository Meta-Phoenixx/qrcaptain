"use client";

const FEATURES = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
      </svg>
    ),
    title: "QR Code Scanning",
    description: "Every vessel gets a unique QR code. Mechanics scan to access full service history instantly.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-1.5 3 1.5m0 0l3-1.5M12 12.75l-3-1.5M12 12.75l3-1.5m-3 1.5V18" />
      </svg>
    ),
    title: "Real-Time Work Tracking",
    description: "Track work orders from quote to completion with photos, parts, and live status updates.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384-3.087A1.5 1.5 0 006 13.5V18a1.5 1.5 0 001.036 1.43l5.384 1.795a1.5 1.5 0 00.928 0l5.384-1.795A1.5 1.5 0 0019.768 18v-4.5a1.5 1.5 0 00-.036-.157l-5.384-3.087a1.5 1.5 0 00-.928 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5V6a1.5 1.5 0 011.036-1.43l5.384-1.795a1.5 1.5 0 01.928 0l5.384 1.795A1.5 1.5 0 0119.768 6v7.5" />
      </svg>
    ),
    title: "Equipment Manifest",
    description: "15-category equipment catalog per vessel — from propulsion to electronics, every part documented.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "Verified History",
    description: "Every service record is timestamped, photo-documented, and tied to verified mechanic profiles.",
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="relative py-20 md:py-28">
      {/* Top divider */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="max-w-[1200px] mx-auto px-5">
        <div className="text-center mb-16">
          <h2
            className="font-heading font-bold text-white mb-4"
            style={{
              fontSize: "clamp(1.75rem, 4vw, 3rem)",
              letterSpacing: "-0.03em",
            }}
          >
            Built for the water
          </h2>
          <p className="text-white/50 text-base max-w-[500px] mx-auto" style={{ lineHeight: 1.7 }}>
            Everything you need to manage vessel maintenance, from dock to done.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px">
          {FEATURES.map((feature, i) => (
            <div key={i} className="relative group">
              {/* Vertical divider */}
              {i > 0 && (
                <div className="hidden lg:block absolute left-0 top-[10%] bottom-[10%] w-px bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />
              )}

              <div className="p-8 rounded-2xl transition-all duration-300 hover:bg-white/[0.02] group-hover:border-white/[0.06]">
                <div className="text-captain-400 mb-5">{feature.icon}</div>
                <h3 className="font-heading font-medium text-white text-lg mb-2">
                  {feature.title}
                </h3>
                <p className="text-white/40 text-base" style={{ lineHeight: 1.7 }}>
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
