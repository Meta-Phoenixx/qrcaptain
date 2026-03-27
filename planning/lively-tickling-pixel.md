# Subscription Model Implementation Plan

## Context
Noetic Soul Coffee is launching the **Noetic Mindful Explorer Experience** — a subscription program for all 6 coffees and coffee bundles. The pricing structure:

- **First 25 subscribers:** 50% OFF their first order (early adopter reward / urgency driver)
- **All subscribers ongoing:** 11% OFF all subscription products while they remain active

The cart upsell widget will encourage one-time buyers to convert to subscribers at checkout, highlighting the 50% first-order discount (while slots remain) or 11% ongoing savings.

## Decision: Shopify Subscriptions App + Custom Theme Code

**Use Shopify Subscriptions App (free)** for backend — it handles recurring billing, payment retries, dunning, customer portal (skip/pause/cancel), and email notifications. No need to build a custom app.

**Build custom theme code** for three things the app doesn't provide:
1. A branded subscription selector on the product page
2. A cart upsell widget to convert one-time purchases to subscriptions
3. A customer subscription portal page (manage subscriptions, view schedule, payment history, update payment method)

The theme already has selling plan display code in `cart-drawer.liquid` (line 142) and `main-cart.liquid` (line 107) — these will show subscription names automatically once selling plans exist.

---

## Pricing Structure: Noetic Mindful Explorer Experience

| Tier | Discount | Applies To | How It Works |
|------|----------|------------|--------------|
| **Early Adopter (first 25)** | 50% OFF | First order only | Automatic discount code `EXPLORER50` applied at checkout (usage-limited to 25) |
| **Ongoing Member** | 11% OFF | All subscription orders | Selling plan recurring percentage discount (already configured in Shopify Subscriptions app) |

**Implementation approach (revised):**
- The Shopify Subscriptions app doesn't support separate first-delivery adjustments — so we use a **two-layer approach**:
  1. **Selling plan (11% off):** Already configured by user — applies automatically to all subscription deliveries
  2. **Discount code `EXPLORER50` (50% off):** Created in Shopify admin with a 25-use limit. Displayed on the product page as an auto-applied code for early adopters. Once 25 uses are exhausted, Shopify rejects the code and the theme falls back to showing only the 11% subscription savings.
- **Tracking the 25-subscriber cap:** Use the discount code's usage count (queryable via Admin API) rather than a custom metafield — simpler and more reliable.

---

## Phase 0: Shopify Admin Setup

1. ~~Install **Shopify Subscriptions** app~~ — **DONE**
2. ~~Create selling plan group **"Noetic Mindful Explorer Experience"** with 11% off at 2/4/8 week frequencies~~ — **DONE**
3. **Remaining (user action):** Create discount code `EXPLORER50` in Shopify Admin > Discounts:
   - Type: Percentage, 50% off
   - Applies to: Subscription first orders only
   - Usage limit: 25 total uses
   - No minimum purchase requirement
   - Auto-apply if possible, or prominently displayed on product page
4. Assign the selling plan group to all 6 coffees + bundles (if not already done)
5. Verify data exists: preview dev theme and check `{{ product.selling_plan_groups | json }}`

---

## Phase 1: Product Page Subscription Selector

**File:** `sections/main-product.liquid`

**Placement:** Between variant pills and ATC button (keeps ATC above fold on mobile)

**UI:** Two pill-shaped radio options side by side:
- "One-Time Purchase" (default, selected)
- "Join the Mindful Explorer Experience — Save 11%"

When "Subscribe" is selected, a compact frequency dropdown slides open below.

**Early adopter urgency banner** (shown when `shop.metafields.noetic.subscriber_count < 25`):
- Gold highlight banner above the pills: "First 25 Explorers get 50% OFF their first order! Only X spots left."
- Counter updates from the shop metafield
- When 25 is reached, banner switches to: "Members save 11% on every delivery"

**Form integration:** Add `<input type="hidden" name="selling_plan" value="">` inside the existing product form. Shopify's `/cart/add.js` reads this automatically — no changes to `product-form.js` needed.

**JS behavior (inline in section):**
- Toggle frequency dropdown visibility
- Set `selling_plan` hidden input to selected plan ID (or empty for one-time)
- Update ATC button price to show discounted amount
- Re-calculate on variant change

**CSS:** Add to `assets/product-conversion.css` — reuse existing pill patterns (`.pdp-pill` border-radius, active states, gold accent `#fdb142`)

**Mobile budget:** Selector adds ~40px collapsed height. ATC stays above fold on 375px+ screens.

---

## Phase 2: Cart Upsell Widget

**Files:** `snippets/cart-drawer.liquid` + `sections/main-cart.liquid`

**Trigger:** Shows on any cart line item where `item.selling_plan_allocation == nil` (one-time purchase)

**UI:** Compact banner below each eligible line item:
- Gold left border accent
- When < 25 subscribers: "Join the Mindful Explorer Experience — 50% OFF your first order! Only X spots left."
- When >= 25 subscribers: "Join the Mindful Explorer Experience — Save 11% on every delivery"
- Frequency selector + "Switch to Subscription" CTA button
- Dismiss "X" button (stored in sessionStorage)

**New files:**
- `assets/subscription-upsell.js` — Fetches `/products/{handle}.js` to get selling plan data, renders upsell banners, handles conversion via `/cart/change.js`
- `assets/subscription-upsell.css` — Banner styling matching dark theme

**Conversion flow:**
1. User clicks "Switch to Subscription"
2. JS calls `/cart/change.js` with `{ id: lineItemKey, selling_plan: planId }`
3. Cart re-renders using existing `addToCartSuccess()` / `addToMainCartSuccess()` functions
4. Line item now shows subscription name, upsell banner disappears

---

## Phase 3: Customer Subscription Portal

**What Shopify Subscriptions app provides:** A basic customer portal accessible from the customer account page where subscribers can pause, skip, cancel, or resume subscriptions. However, its UI is minimal and not customizable.

**What we'll build:** A branded "My Subscriptions" page that matches the Noetic Soul Coffee design, accessible from the customer account area. This uses the **Shopify Customer Account API** and **Subscription Contract** objects.

### Portal Features

1. **Subscription Overview Dashboard**
   - Active subscriptions list with product image, name, frequency, next delivery date
   - Status badges: Active, Paused, Cancelled
   - Quick actions: Pause / Resume / Cancel per subscription

2. **Subscription Details (per subscription)**
   - Delivery schedule — upcoming deliveries with dates
   - Order history — past subscription orders with links to order details
   - Frequency management — change delivery frequency (2 weeks / 4 weeks / 8 weeks)
   - Product swap — switch to a different coffee while keeping the subscription active
   - Skip next delivery button

3. **Payment Management**
   - Current payment method on file (last 4 digits, card type)
   - Update payment method — redirects to Shopify's secure payment update flow
   - Payment history — list of charges with dates, amounts, and status (paid/failed/refunded)
   - Failed payment alerts with retry option

4. **Account Settings**
   - Shipping address for subscription deliveries
   - Email notification preferences (upcoming delivery reminders, payment confirmations)

### Implementation Approach: Shopify Customer Account Extensions

Shopify's new customer account pages support **account extensions** that render custom UI within the native `/account` area. This is the cleanest approach:

- Create a customer account UI extension using Shopify CLI
- Extension renders within the existing account page — no separate page needed
- Has access to subscription contracts via the Storefront API
- Inherits Shopify's authentication — no login flow to build

### Key API Endpoints

- **Subscription Contracts:** `customer.subscriptionContracts` via Storefront API — lists all subscriptions for the logged-in customer
- **Update Payment Method:** Shopify provides a `customerPaymentMethodSendUpdateEmail` mutation — sends the customer a secure link to update their card
- **Subscription Actions:** Pause/resume/cancel require the Admin API — these can be triggered via the Shopify Subscriptions app's built-in customer portal, or via a proxy app endpoint

### New Files

| File | Purpose |
|------|---------|
| `templates/customers/subscriptions.liquid` | Customer subscription portal page |
| `assets/subscription-portal.css` | Portal styles matching Noetic dark theme |
| `assets/subscription-portal.js` | Fetch subscription data, handle actions |
| `sections/customer-subscriptions.liquid` | Section for the portal content |

### Portal Design

- Dark background matching site theme (#000000)
- Gold accent (#fdb142) for active status badges and CTA buttons
- Comfortaa headings, Manrope body text
- Card-based layout for each subscription (similar to product cards)
- Mobile-responsive: single column stack on mobile, 2-column on desktop
- Skeleton loading states while API data fetches

---

## Phase 4: Asset Loading

Load `subscription-upsell.css` and `subscription-upsell.js` (deferred) in:
- `snippets/cart-drawer.liquid`
- `sections/main-cart.liquid`
- `sections/main-product.liquid` (so upsell works when drawer opens from product page)

---

## Critical Files

| File | Action |
|------|--------|
| `sections/main-product.liquid` | Add subscription selector Liquid + JS between variants and ATC |
| `assets/product-conversion.css` | Add subscription selector styles |
| `snippets/cart-drawer.liquid` | Add upsell placeholder div for one-time items |
| `sections/main-cart.liquid` | Add upsell placeholder div for one-time items |
| `assets/subscription-upsell.js` | **New** — upsell fetch, render, conversion logic |
| `assets/subscription-upsell.css` | **New** — upsell banner styles |
| `templates/customers/subscriptions.liquid` | **New** — customer subscription portal page |
| `sections/customer-subscriptions.liquid` | **New** — portal section with subscription management UI |
| `assets/subscription-portal.js` | **New** — fetch subscription data, handle pause/resume/cancel/payment actions |
| `assets/subscription-portal.css` | **New** — portal styles matching Noetic dark theme |

---

## Verification

1. **Graceful degradation:** If Shopify Subscriptions app isn't installed yet, `product.selling_plan_groups.size == 0` and no subscription UI renders
2. **One-time purchase:** Add product without subscription — verify `selling_plan` is empty, cart shows no subscription label
3. **Subscription purchase:** Select "Join the Mindful Explorer Experience", choose frequency, add to cart — verify cart drawer/page shows plan name, price reflects 50% off first order (when < 25 subs) or 11% off (when >= 25 subs)
4. **Cart upsell:** Add one-time item, open cart, verify upsell banner appears. Click "Switch" — verify item converts, price updates, banner disappears
5. **Dismiss persistence:** Dismiss upsell, verify it stays hidden for the session
6. **Variant changes:** Change variant while subscription selected — price updates correctly
7. **Mobile:** Test on 375px+ screens — ATC stays above fold with selector collapsed
8. **Mixed cart:** One subscription + one one-time item — both display correctly, upsell only on one-time
9. **Checkout:** Proceed to checkout with subscription — Shopify checkout shows recurring billing details
10. **Customer portal — logged in:** Log in as a customer with an active subscription, navigate to /account/subscriptions, verify subscription list loads with correct status/dates
11. **Customer portal — actions:** Test pause, resume, skip next delivery, change frequency — verify each action updates the UI
12. **Customer portal — payment:** Verify "Update Payment Method" sends the secure update email via Shopify
13. **Customer portal — history:** Verify past orders and payment history display correctly
14. **Customer portal — mobile:** Verify portal is responsive, cards stack on mobile, all actions accessible
15. **Push to dev theme first:** `shopify theme push --store a484b9-17.myshopify.com --theme 150395158711`
