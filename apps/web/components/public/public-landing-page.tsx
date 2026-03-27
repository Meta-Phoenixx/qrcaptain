"use client";

import { Navbar } from "./navbar";
import { HeroSection } from "./hero-section";
import { FeaturesGrid } from "./features-grid";
import { OwnerFeatures } from "./owner-features";
import { MechanicFeatures } from "./mechanic-features";
import { BetaSection } from "./beta-section";
import { WaitlistSection } from "./waitlist-section";
import { Footer } from "./footer";

export function PublicLandingPage() {
  return (
    <div
      className="min-h-screen font-inter text-white scroll-smooth text-lg sm:text-base"
      style={{ background: "#030014" }}
    >
      {/* Override ThemeWrapper background */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{ background: "#030014" }} />

      <div className="relative z-10">
        <Navbar />
        <HeroSection />
        <FeaturesGrid />
        <OwnerFeatures />
        <MechanicFeatures />
        <BetaSection />
        <WaitlistSection />
        <Footer />
      </div>
    </div>
  );
}
