# Plan: QR Captain Public Landing Page + Raffle Intake Form

## Context

QR Captain currently shows a simple sign-in form to unauthenticated visitors. To support upcoming marketing, beta launch (Q2 2026), and the Safety Harbor Slam fishing tournament raffle (March 28-29, 2026), we need:

1. A polished public landing page modeled after [reflect.app](https://reflect.app) — dark theme, glassmorphism, animated sections — adapted to QR Captain's brand (captain palette, Ubuntu/Inter fonts)
2. A raffle intake form at `/raffle` for the "Water to a Worthy Cause" 50/50 Biggest Trout raffle, co-sponsored by Walden Marine Mobile Mechanic & QR Captain
3. Both pages send confirmation emails via Resend

---

## Phase 1: Convex Backend

### 1.1 Add tables to `convex/schema.ts`

Add two new tables:

- **`waitlistSignups`** — fields: `name`, `email`, `roleInterest` (owner/mechanic/both), `source` (optional), `createdAt` — indexes: `by_email`, `by_created`
- **`raffleEntries`** — fields: `name`, `phone`, `email`, `ticketTier` (single/popular/value/bigdog), `ticketCount`, `amount`, `confirmationEmailSent`, `createdAt` — indexes: `by_email`, `by_created`

### 1.2 Create `convex/waitlist.ts`

- `submitWaitlistSignup` — public mutation (no auth). Checks email uniqueness, inserts row, schedules confirmation email
- `getWaitlistCount` — public query returning total count for social proof

### 1.3 Create `convex/raffle.ts`

- `submitRaffleEntry` — public mutation. Maps tier to ticket count/amount ($5→1, $20→6, $50→15, $100→40). Inserts row, schedules confirmation email
- `getRaffleStats` — public query returning pot total and entry count (live-updating via Convex reactivity)

### 1.4 Create `convex/emails.ts`

Convex actions using Resend REST API (same pattern as [ResendOTPPasswordReset.ts](convex/ResendOTPPasswordReset.ts)):

- `sendRaffleConfirmation` — confirms entry, states ticket tier selected, reminds to **pick up and purchase tickets at Captain's Meeting on Friday March 27, 6:30 PM at Backwater Provisions, Safety Harbor**
- `sendWaitlistConfirmation` — confirms waitlist registration, mentions beta program timeline

---

## Phase 2: Landing Page Components

All new components in `apps/web/components/public/`.

### 2.1 `public-landing-page.tsx` — orchestrator
- Composes all sections, sets dark background (`#030014`), `scroll-smooth`
- Client component wrapping all sections

### 2.2 `navbar.tsx` — fixed top nav
- Left: QR Captain logo + name
- Center: pill-shaped nav container with smooth-scroll links (Features, For Owners, For Mechanics, Beta Program)
- Right: "Login" text link → `/signin`, "Join Waitlist" primary CTA button
- Glassmorphism backdrop, transparent → glass on scroll

### 2.3 `hero-section.tsx`
- Badge pill: "Launching Q2 2026 — Beta Program Open"
- Headline (72px Ubuntu, tight tracking): compelling vessel maintenance hook
- Subheadline (18px Inter, muted): value proposition
- CTAs: "Join the Waitlist" (captain-500 gradient primary), "Learn More" (ghost)
- Animated radial gradient orbs in background (captain-500/captain-900, transform+opacity only)

### 2.4 `features-grid.tsx`
- 4-column grid (responsive: 4→2→1 cols)
- Glass cards with gradient divider lines between columns (Reflect style)
- Key features: QR Code Scanning, Real-Time Work Tracking, Equipment Manifest, Verified History
- Each card: icon, title, description
- Hover: border brightens, subtle translateY(-2px)

### 2.5 `owner-features.tsx` (id="owners")
- Showcase section with alternating text/visual layout
- Features: vessel registration, QR codes, maintenance history, 15-category equipment manifest, mechanic ratings, preferred mechanics, service reminders

### 2.6 `mechanic-features.tsx` (id="mechanics")
- Showcase section mirroring owner section
- Features: QR scanning, photo documentation, parts tracking with warranties, reputation building, directory listing, availability management, quote system

### 2.7 `waitlist-section.tsx` (id="waitlist")
- "Be First On Board" heading
- Form: name, email, role interest (owner/mechanic/both segmented control)
- Submit → Convex `submitWaitlistSignup` mutation
- Success state with confirmation message
- Social proof: live waitlist count

### 2.8 `beta-section.tsx` (id="beta")
- "Beta Program — Q2 2026" heading
- Benefits: early access, influence product, founding member status
- CTA scrolls to waitlist section

### 2.9 `footer.tsx`
- QR Captain logo, "Forged in Saltwater" tagline, copyright
- Navigation links, contact info

---

## Phase 3: Raffle Page

### 3.1 Route: `apps/web/app/raffle/page.tsx`
- Public page, no auth gates
- SEO metadata: "Biggest Trout 50/50 Raffle | Walden Marine x QR Captain"
- Renders `RafflePage` component

### 3.2 `apps/web/components/public/raffle-page.tsx`
- Dark water-themed background with blues
- Header: Partnership logos (Walden Marine, QR Captain), "Safety Harbor Slam" branding
- Hero: "From the Water to a Worthy Cause" / "Biggest Trout — 50/50 Raffle" / "Catch Big. Win Big. Give Back."
- Event info card: Captain's Meeting details (Friday March 27, 6:30 PM, Backwater Provisions)
- **Ticket selection**: 4 tier cards in grid
  - $5 / 1 Ticket
  - $20 / 6 Tickets — "Most Popular" badge
  - $50 / 15 Tickets — "Best Value" badge
  - $100 / 40 Tickets — "Big Dog Entry" badge
- **Intake form**: Name, Phone, Email fields
- Submit → Convex `submitRaffleEntry` → triggers confirmation email
- Success state: confirmation + reminder about Captain's Meeting ticket pickup
- "Give Back" section: Cass Walden / Moody Aviation mission info
- **Live Pot Total**: Real-time from `getRaffleStats` query
- How It Works: buy tickets → fish → biggest trout wins half → other half to cause
- Contact: 813-965-8711, waldenmarine@gmail.com
- Flyer image as visual element (copy `raffle/Water2WorthyCause-Flyer_v2.png` → `apps/web/public/raffle/`)

---

## Phase 4: Route Integration

### 4.1 Update `apps/web/app/page.tsx`
- `<Unauthenticated>` renders `<PublicLandingPage />` instead of `<SignInPageContent />`
- `<AuthLoadingWithTimeout>` fallback also shows `<PublicLandingPage />` instead of sign-in
- `<Authenticated>` block unchanged (still redirects to `/home` or shows Dashboard)

### 4.2 Ensure `/signin` route still works as direct login page

---

## Phase 5: Assets & Styling

### 5.1 Copy raffle flyer
`raffle/Water2WorthyCause-Flyer_v2.png` → `apps/web/public/raffle/Water2WorthyCause-Flyer_v2.png`

### 5.2 Extend `apps/web/app/globals.css`
Add keyframes for landing page animations (float, glow, slideInUp) — all using only `transform` and `opacity`

### 5.3 Extend `apps/web/tailwind.config.ts` if needed
Add landing-dark background color, animation utilities

---

## Phase 6: SEO & Metadata

- Update root layout metadata with Open Graph tags
- Raffle page exports its own metadata

---

## Screenshot Verification

After each major section is built:
1. Start dev server: `pnpm dev:web`
2. Screenshot landing page: `node screenshot.mjs http://localhost:3000`
3. Screenshot raffle page: `node screenshot.mjs http://localhost:3000/raffle`
4. Compare against Reflect reference for design fidelity
5. Minimum 2 comparison rounds per the project's hard rules

---

## Key Files to Modify/Create

| File | Action |
|------|--------|
| `convex/schema.ts` | Modify — add 2 tables |
| `convex/waitlist.ts` | Create |
| `convex/raffle.ts` | Create |
| `convex/emails.ts` | Create |
| `apps/web/app/page.tsx` | Modify — swap unauthenticated view |
| `apps/web/app/raffle/page.tsx` | Create |
| `apps/web/components/public/*.tsx` | Create — ~10 components |
| `apps/web/app/globals.css` | Modify — add animation keyframes |
| `apps/web/tailwind.config.ts` | Modify — extend if needed |
| `apps/web/public/raffle/` | Create — copy flyer asset |

## Reusable Existing Code

| What | Where |
|------|-------|
| Glass primitives (GlassCard, GlassButton, GlassInput) | [glass.tsx](apps/web/components/ui/glass.tsx) |
| Resend email pattern | [ResendOTPPasswordReset.ts](convex/ResendOTPPasswordReset.ts) |
| Captain color palette | [tailwind.config.ts](apps/web/tailwind.config.ts) |
| Font setup (Ubuntu/Inter) | [layout.tsx](apps/web/app/layout.tsx) |
| Auth flow pattern | [page.tsx](apps/web/app/page.tsx) |

## Execution Order

1. Convex schema + backend functions (Phase 1)
2. Landing page components (Phase 2) — build section by section with screenshots
3. Raffle page (Phase 3) — build with screenshots
4. Route integration (Phase 4)
5. Assets + styling polish (Phase 5)
6. SEO metadata (Phase 6)
7. Final screenshot verification rounds
