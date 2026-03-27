# Landing Page & Raffle Intake Form — Completion Summary

**Date:** March 26, 2026

---

## What Was Built

### 1. Public Landing Page (`/`)

Dark-themed marketing page inspired by Reflect.app, adapted to QR Captain's brand (captain blue palette, Ubuntu/Inter fonts).

**Sections:**
- **Fixed navbar** — Logo, pill-shaped nav links (Features, For Owners, For Mechanics, Beta Program), Login link → `/signin`, "Join Waitlist" CTA
- **Hero** — "Your Vessel's Complete Maintenance Record. Always On Board." with gradient text, animated background orbs, beta badge (Q2 2026), dual CTAs
- **Features grid** — 4-column: QR Code Scanning, Real-Time Work Tracking, Equipment Manifest, Verified History
- **Owner features** — 6 cards: vessel management, maintenance history, 15-category equipment manifest, ratings, preferred mechanics, service reminders
- **Mechanic features** — 6 cards: photo documentation, parts/warranty tracking, quote system, reputation, directory listing, availability management
- **Beta Program** — Q2 2026 section with perks (early access, shape product, founding member)
- **Waitlist signup form** — Name, email, role interest (owner/mechanic/both), live waitlist count, sends confirmation email
- **Footer** — Logo, tagline ("Forged in Saltwater"), links, copyright

**Auth behavior:** Unauthenticated users see the landing page. Authenticated users are redirected to `/home` or Dashboard (unchanged).

---

### 2. Raffle Intake Form (`/raffle`)

"From the Water to a Worthy Cause" — Biggest Trout 50/50 Raffle for the Safety Harbor Slam fishing tournament.

**Partnership:** Walden Marine Mobile Mechanic & QR Captain

**Page sections:**
- **Header** — QR Captain logo, "Back to Home" link
- **Hero** — "From the Water to a Worthy Cause" / "Biggest Trout — 50/50 Raffle" / "Catch Big. Win Big. Give Back."
- **Event info card** — Safety Harbor Slam (March 28-29, 2026), Captain's Meeting reminder (Friday March 27, 6:30 PM, Backwater Provisions, Safety Harbor)
- **Ticket selection** — 4 tiers in a grid:
  - $5 / 1 Ticket
  - $20 / 6 Tickets — "Most Popular"
  - $50 / 15 Tickets — "Best Value"
  - $100 / 40 Tickets — "Big Dog Entry"
- **Intake form** — Full Name, Phone Number, Email Address
- **Live Pot Total** — Real-time via Convex reactivity (winner pot / cause pot split)
- **How It Works** — 5-step process
- **Give Back** — Cass Walden / Moody Aviation mission info
- **Raffle flyer image** — `Water2WorthyCause-Flyer_v2.png`
- **Contact** — 813-965-8711, waldenmarine@gmail.com

**Confirmation email:** Sent via Resend on submission. Confirms ticket tier, reminds to pick up and purchase tickets at Captain's Meeting on Friday.

---

### 3. Convex Backend

**New tables in `convex/schema.ts`:**
- `waitlistSignups` — name, email, roleInterest, source, createdAt (indexes: by_email, by_created)
- `raffleEntries` — name, phone, email, ticketTier, ticketCount, amount, confirmationEmailSent, createdAt (indexes: by_email, by_created)

**New files:**
- `convex/waitlist.ts` — `submitWaitlistSignup` (mutation, deduplicates by email), `getWaitlistCount` (query)
- `convex/raffle.ts` — `submitRaffleEntry` (mutation, maps tier to count/amount), `getRaffleStats` (query, returns pot total, entries, tickets, winner/cause split)
- `convex/emails.ts` — `sendRaffleConfirmation` (internalAction via Resend), `markRaffleEmailSent` (internalMutation), `sendWaitlistConfirmation` (internalAction via Resend)

---

## Files Created

| File | Purpose |
|------|---------|
| `convex/waitlist.ts` | Waitlist signup mutation + count query |
| `convex/raffle.ts` | Raffle entry mutation + live stats query |
| `convex/emails.ts` | Confirmation email actions via Resend |
| `apps/web/components/public/public-landing-page.tsx` | Landing page orchestrator |
| `apps/web/components/public/navbar.tsx` | Fixed glassmorphism navbar |
| `apps/web/components/public/hero-section.tsx` | Hero with animated background |
| `apps/web/components/public/features-grid.tsx` | 4-column feature overview |
| `apps/web/components/public/owner-features.tsx` | Owner capability cards |
| `apps/web/components/public/mechanic-features.tsx` | Mechanic capability cards |
| `apps/web/components/public/waitlist-section.tsx` | Waitlist signup form |
| `apps/web/components/public/beta-section.tsx` | Beta program CTA |
| `apps/web/components/public/footer.tsx` | Site footer |
| `apps/web/components/public/raffle-page.tsx` | Full raffle intake page |
| `apps/web/app/raffle/page.tsx` | Raffle route with SEO metadata |
| `apps/web/public/raffle/Water2WorthyCause-Flyer_v2.png` | Raffle flyer asset |
| `screenshot.mjs` | Puppeteer screenshot utility |

## Files Modified

| File | Change |
|------|--------|
| `convex/schema.ts` | Added `waitlistSignups` and `raffleEntries` tables |
| `apps/web/app/page.tsx` | Swapped `SignInPageContent` for `PublicLandingPage` in unauthenticated state |
| `apps/web/app/globals.css` | Added `float` and `glow` animation keyframes |

---

## Design Decisions

- **Dark theme only** for landing page (`#030014` background) — overrides ThemeWrapper
- **Captain palette** (`captain-500: #0ea5e9`) for primary accents, emerald for mechanic section
- **Glassmorphism** cards: `border-white/[0.06]`, `bg-white/[0.02]`, `backdrop-blur-xl`
- **Animations** use only `transform` and `opacity` per project hard rules
- **No `transition-all`** per project hard rules
- **Login button** appears as secondary text link, not primary CTA — page feels like product home, not login page
- **Raffle allows multiple entries** per email (different ticket tiers) — no deduplication on raffle
- **Waitlist deduplicates** by email — returns "already_registered" if duplicate
