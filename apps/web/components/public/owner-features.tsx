"use client";

const OWNER_FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
      </svg>
    ),
    title: "Register & Manage Vessels",
    description: "Add your boats with make, model, year, and hull ID. Each vessel gets a unique QR code.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Complete Maintenance History",
    description: "Every work order, every part, every photo — timestamped and organized by vessel.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384-3.087A1.5 1.5 0 006 13.5V18a1.5 1.5 0 001.036 1.43l5.384 1.795a1.5 1.5 0 00.928 0l5.384-1.795A1.5 1.5 0 0019.768 18v-4.5a1.5 1.5 0 00-.036-.157l-5.384-3.087a1.5 1.5 0 00-.928 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5V6a1.5 1.5 0 011.036-1.43l5.384-1.795a1.5 1.5 0 01.928 0l5.384 1.795A1.5 1.5 0 0119.768 6v7.5" />
      </svg>
    ),
    title: "15-Category Equipment Manifest",
    description: "Track everything from propulsion and electrical to rigging and safety gear — with service intervals.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
    title: "Rate & Review Mechanics",
    description: "Dual rating system — rate on quality, communication, professionalism, and value.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    title: "Preferred Mechanics",
    description: "Build your trusted crew. Manage authorizations and keep notes on your go-to mechanics.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
    title: "Service Reminders",
    description: "Never miss a scheduled service. Automated alerts for date-based and hour-based intervals.",
  },
];

export function OwnerFeatures() {
  return (
    <section id="owners" className="relative py-20 md:py-28">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="max-w-[1200px] mx-auto px-5">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-captain-500/20 bg-captain-500/5 mb-5">
            <span className="text-sm text-captain-400 font-medium uppercase tracking-wider">
              For Boat Owners
            </span>
          </div>
          <h2
            className="font-heading font-bold text-white mb-4"
            style={{
              fontSize: "clamp(1.75rem, 4vw, 3rem)",
              letterSpacing: "-0.03em",
            }}
          >
            Your vessel, your records, your control
          </h2>
          <p className="text-white/50 text-base max-w-[550px] mx-auto" style={{ lineHeight: 1.7 }}>
            Whether you own a center console or a 50-foot sportfish, The QR Captain gives you a
            complete digital record of every service, every part, every mechanic.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {OWNER_FEATURES.map((feature, i) => (
            <div
              key={i}
              className="group p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300"
              style={{
                boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04)",
              }}
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-captain-500/10 border border-captain-500/20 flex items-center justify-center text-captain-400 mb-3 sm:mb-4 group-hover:bg-captain-500/15 transition-colors duration-300">
                {feature.icon}
              </div>
              <h3 className="font-heading font-medium text-white text-sm sm:text-lg mb-1 sm:mb-2">
                {feature.title}
              </h3>
              <p className="text-white/40 text-xs sm:text-base" style={{ lineHeight: 1.7 }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
