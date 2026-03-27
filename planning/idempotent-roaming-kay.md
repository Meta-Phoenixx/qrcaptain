# Plan: Sprint 2 — Product Page Restructure (LastObject Model)

## Context
Sprint 1 (trust badges, sticky ATC, free shipping bar, express checkout, shipping/returns) is deployed on preview theme `Sprint1-ConversionOptimization` (#150395158711).

Sprint 2 restructures the above-the-fold product page layout to mirror the high-converting LastObject store (lastobject.com/products/lastswab — $2M+/year). Reference materials in `high_converting_pages/`. The goal is to minimize above-the-fold clutter, lead with the most important info, and make the buy action frictionless.

**Scope:** Phase 1 only = above-the-fold restructure. Deliver for review before proceeding to Phase 2 (Sprint 2.1–2.5: benefits, urgency, cross-sell, sharing, reviews).

---

## Phase 1: Above-the-Fold Restructure

### Current vs. Target Layout (Right Column)

```
CURRENT (12 elements above ATC)     →  TARGET (6 elements above ATC)
─────────────────────────────────       ─────────────────────────────────
1. Back button                          1. Product Title
2. Wishlist heart                       2. Star Rating + Review Count
3. Vendor subtitle                      3. Short Description (1-2 sentences)
4. Product Title                        4. Variant Pills (Size/Grind/Roast + Color)
5. Judge.me reviews                     5. ATC Button (price inside) + Qty inline
6. Price (separate)                     6. Delivery time text
7. Stock status                         ─── below ATC ───
8. Variant picker                       7. Trust badges (from Sprint 1)
9. Countdown timer                      8. Free shipping bar (from Sprint 1)
10. Description (truncated)             9. Expandable drawers (coffee-specific)
11. Quantity selector                   10. Express checkout
12. ATC button
```

### 1.1 Restructure Block Order in `sections/main-product.liquid`

**Remove/relocate from above-the-fold:**
- **Back button** → remove entirely (users have browser back + breadcrumbs)
- **Wishlist heart** → move to top-right of image gallery (overlay on image)
- **Vendor subtitle** → remove from above fold (vendor visible in description section below)
- **Stock status custom_liquid** → remove separate block; integrate as subtle indicator in ATC button area
- **Countdown timer** → keep only if metafield exists, move below ATC
- **Separate price block** → remove; price moves INSIDE ATC button

**New right-column order:**
1. **Product Title** `<h1>` (upgrade from `<h2>`)
2. **Judge.me Star Rating** + clickable review count
3. **Short Description** — 1-2 punchy sentences from `product.description` (truncated) or `product.metafields.custom.short_description`
4. **Variant Selectors** — styled as pills (like LastObject's Original/Beauty/Baby). Products use options like Size, Grind, Color
5. **ATC Row** — single row containing:
   - ATC button with price inside: `"Add to cart · {{ price | money }}"`
   - Quantity selector inline (−/+) to the right
   - Disabled state: "Sold Out"
6. **Delivery Info** — "3-5 day delivery" text below button
7. **Sprint 1 Trust Badges** (kept from Sprint 1)
8. **Free Shipping Progress Bar** (kept from Sprint 1)
9. **Coffee-Specific Expandable Drawers:**
   - "Sourcing & Origin" — where the beans come from, farm details, altitude
   - "Brewing Guide" — recommended brew method, ratio, temperature
   - "Freshness Guarantee" — roast-to-ship timeline, storage tips
   - "Shipping & Returns" — consolidate from Sprint 1 collapsibles
10. **Express Checkout** (Shop Pay, Apple Pay — kept from Sprint 1)

### 1.2 ATC Button Redesign

**File:** `sections/main-product.liquid` (pro_btn block area)

Current:
```
[   Add to Cart   ]  (plain button)
── or express checkout ──
[Shop Pay] [Apple Pay]
```

Target (matching LastObject):
```
[ Add to cart · $24.99 ] [ − 1 + ]
   3-5 day delivery
```

- Price rendered inside button text dynamically (updates on variant change)
- Quantity selector moved inline to the right of ATC button
- Delivery estimate text below
- Express checkout moves below the expandable drawers

### 1.3 Announcement Bar

**File:** `sections/header.liquid` or `layout/theme.liquid`

- Add a slim announcement bar at very top of page: **"Buy One, Gift One"**
- Style: full-width, brand gold (#FDB142) background, dark text, ~32px height
- Should be visible on all pages, not just product page
- Configurable via theme settings so user can update the text anytime

### 1.4 Image Gallery Enhancements

**File:** `sections/main-product.liquid` (gallery area)

- **Desktop:** Keep current layout (main image + thumbnail strip below) — matches LastObject
- **Mobile:** Switch thumbnails to dot indicators (save vertical space per transcript advice)
- **Wishlist:** Move heart icon to overlay position on top-right of main image

### 1.5 Mobile-Specific Adjustments

Per LastObject mobile screenshots and transcript:
- Product image: full-width, swipeable with dots (not thumbnails)
- Title visible immediately after image
- Stars + price visible before any scrolling
- ATC button should be reachable with minimal scroll
- Sticky ATC from Sprint 1 catches anything below fold

---

## Phase 2: Sprint 2.1–2.5 (Below the Fold)

### 2.1 Product Benefits Section
- Full-width section below the main product area
- "Why Choose Noetic Soul Coffee?" heading
- 3 benefit cards with icons and short text (e.g., "Single Origin", "Freshly Roasted to Order", "Direct Trade")
- Styled with brand colors, imagery

### 2.2 Urgency/Scarcity Messaging
- "Only X left in stock" amber text when `product.selected_or_first_available_variant.inventory_quantity < 10`
- Appears subtly near ATC button area
- Uses existing `pro_count` block data

### 2.3 Cross-sell / Related Products
- "Complete Your Brew" or "Kits & Related Products" section (like LastObject's "Kits & Related Products")
- Use Shopify product recommendations API (`recommendations/products`)
- Show 3-4 products in horizontal scroll
- Include "SAVE X%" badge on bundles

### 2.4 Social Sharing
- Share buttons below expandable drawers: Copy Link, Facebook, X/Twitter, Email
- Lightweight SVG icons, no heavy social SDKs

### 2.5 Judge.me Review Collection Setup
- Ensure review widget displays below product content
- Configure post-purchase review request emails
- Style review stars to match brand (gold #FDB142)

---

## Key Files to Modify

| File | Changes |
|---|---|
| `sections/main-product.liquid` | Complete above-the-fold restructure, ATC redesign, drawer system, gallery mobile dots |
| `assets/product-conversion.css` | Updated styles for new layout, ATC with price, inline qty, drawers, announcement bar |
| `sections/header.liquid` | Announcement bar addition |
| `templates/product.json` | Update block order to match new structure |
| `config/settings_schema.json` | New settings: announcement text, drawer content, delivery estimate |
| `assets/base.css` | Mobile dot indicators for gallery, wishlist overlay positioning |

## Existing Code to Reuse
- `snippets/price.liquid` — price formatting for ATC button
- `assets/product-conversion.css` — Sprint 1 trust badges, sticky ATC, free shipping bar (keep all)
- `snippets/free_shipping.liquid` — free shipping logic
- Variant picker code in main-product.liquid — restyle but reuse variant-radios/variant-selects logic
- `layout/theme.liquid` CSS variables — brand colors, fonts
- Judge.me app blocks — already integrated, just needs repositioning

## Products in Store (for reference)
- **Coffee:** Peacocks Pride, Golden Radiance, Cosmic Confluence, Celestial Twins Treat, Sacred Ascension, Satin Scales, Colombian Brew Hazelnut Instant
- **Bundles:** Noetic Soul Origins Whole Beans Bundle
- **Accessories:** Coffee Canister, Coffee Mugs Set
- **Variant options:** Size, Color (Grind may also be used)

## Verification
- [ ] Above-the-fold shows: Title → Stars → Description → Variants → ATC (with price) + Qty → Delivery text
- [ ] No clutter above title (no back button, vendor, wishlist, separate price)
- [ ] ATC button shows dynamic price that updates on variant change
- [ ] Quantity selector is inline with ATC button
- [ ] Announcement bar visible at top of all pages
- [ ] Mobile: dot indicators instead of thumbnails, image swipeable
- [ ] Expandable drawers work (coffee-specific content)
- [ ] Sprint 1 elements preserved (trust badges, sticky ATC, free shipping bar)
- [ ] Cross-sell section shows related products
- [ ] Screenshot comparison against LastObject reference images
- [ ] Test on mobile (375px) and desktop (1440px)
- [ ] Push to preview theme, do NOT affect live store
