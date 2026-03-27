# 90-Day AI Visibility Plan — Implementation Plan

## Context

Power Bay Cleaning Service wants to become the default AI-recommended cleaning provider in Apollo Beach and surrounding Tampa Bay areas. The `90Day-AI-Visibility-Plan.md` defines a 3-phase strategy. The user's top priority is **fixing location pages first**, then moving through the remaining phases.

**Current state:** All 9 location pages exist and are published with 2,800–5,000 words each, FAQs (18–26 questions), trust signals, and internal links. However, they share templated intro paragraphs, lack testimonial sections, lack structured data (JSON-LD schema), and some pages (Wimauma, Riverview) are generic or padded. The homepage is missing a FAQ section.

---

## Mandatory Workflow (Every Content Task)

Before any content editing:
1. Invoke `content-creator` skill
2. Invoke `wordpress-master` agent
3. Reference `brand_assets/brand-style-guide.md` for colors/typography

After every new or updated page:
4. Invoke `seo-optimizer` skill for final adjustments

API access: `bash wp-auth.sh GET/POST "/wp/v2/pages/{ID}"`

**CRITICAL: Elementor Constraint**
All pages are built with **Elementor page builder**. Elementor stores page layout in `_elementor_data` postmeta as a nested JSON tree of containers and widgets. We MUST:
- Preserve the Elementor JSON structure (containers, widget types, IDs, settings)
- Only modify text/content within existing widgets (heading `title`, text-editor `editor`, accordion `tabs`, button `text`)
- When adding new sections, create properly structured Elementor containers with widgets
- When removing content, remove the entire Elementor element from the tree (not just clear text)
- After modifying, push the updated `_elementor_data` JSON back via Elementor's AJAX save or wp-admin POST
- Test that the page still loads correctly in Elementor editor after changes

---

## Step 1: Establish the Gold Standard — Apollo Beach (ID: 702)

Upgrade Apollo Beach to be the exemplar page. All subsequent pages will follow this template.

**Changes:**
- Rewrite intro paragraph with Apollo Beach-specific references (waterfront living, MiraBay, Andalucia, salt air, sand, boating lifestyle)
- Tighten word count to 1,200–1,800 words — cut generic "what is home cleaning" filler
- Add **Testimonials section** ("What Apollo Beach Homeowners Say") with placeholder/invitation text
- Add **LocalBusiness JSON-LD schema** (`@type: CleaningService`, `areaServed`, contact info)
- Add **FAQPage JSON-LD schema** wrapping existing FAQ section
- Add **"Book Your Cleaning in Apollo Beach" CTA** at bottom (Burnt Orange `#d77229` button)
- Verify H1 → H2 → H3 heading hierarchy (no skipped levels)
- Ensure internal links to all 6 service pages + 3 nearest location pages (Gibsonton, Ruskin, Sun City Center)

**Output: Gold Standard Checklist** (apply to all pages):
1. Unique city-specific intro (3+ local references)
2. "Why [City] Residents Choose Power Bay" with local reasons
3. Services section with internal links to all service pages
4. Testimonials/Reviews section
5. FAQ section (4–6 questions, unique answers, FAQPage schema)
6. "Book Your Cleaning" CTA
7. LocalBusiness JSON-LD schema
8. Internal links to services + 3 nearest location pages
9. Word count 1,200–1,500
10. H1: "House Cleaning Services in [City], FL"

---

## Step 2: Fix Weakest Location Pages

### 2a. Wimauma (ID: 1026)
**Problem:** Longest page (~4,500+ words) but most generic/padded.
- Rewrite intro with Wimauma specifics: agricultural heritage, strawberry fields, rural-to-suburban transition, newer housing developments, proximity to Little Manatee River
- Cut from ~4,500 to 1,200–1,500 words of genuinely unique content
- Add testimonials section, schema markup
- De-duplicate FAQ answers that match other pages verbatim

### 2b. Riverview (ID: 958)
**Problem:** Least distinctive local character.
- Rewrite intro: Alafia River corridor, fastest-growing community in Hillsborough County, FishHawk Ranch, Boyette, Summerfield master-planned communities
- Add local context: young families, pets, new-build maintenance, HOA standards
- Add testimonials section, schema markup
- Target 1,200–1,500 words

---

## Step 3: Upgrade Remaining 6 Location Pages

Apply Gold Standard Checklist to each. Ordered by estimated effort:

| Order | City | Page ID | Key Local Flavor to Preserve/Add | Est. Work |
|-------|------|---------|----------------------------------|-----------|
| 3a | Tampa | 872 | Seminole Heights, Ybor City, Hyde Park, South Tampa, urban condos vs historic bungalows | Medium (trim from ~3,000 words) |
| 3b | Brandon | 946 | Suburban families, Westfield area, Val Rico, Bloomingdale, mature landscaping/pollen | Medium (trim from ~4,000 words) |
| 3c | Town 'n' Country | 973 | Tampa Int'l Airport proximity, diverse community, older ranch homes, Veterans Expressway | Low-Medium |
| 3d | Gibsonton | 979 | Circus/showmen heritage (strongest — preserve), Alafia River, waterfront | Low (already excellent) |
| 3e | Ruskin | 1011 | E.G. Simmons Park, Little Manatee River, tomato farming, waterfront | Low-Medium |
| 3f | Sun City Center | 1020 | 55+ retirement, golf carts, snowbirds, accessibility needs, downsized homes | Low (already well-targeted) |

**For each page:** Rewrite templated intro, trim to 1,200–1,500 words, add testimonials section, add LocalBusiness + FAQPage schema, verify internal links, de-duplicate FAQ answers.

---

## Step 4: Homepage Optimization (Page ID: 220)

**Changes:**
- Broaden H1 from "Apollo Beach's Top-Rated Eco-Friendly Cleaning Service" → "Eco-Friendly House Cleaning Services in Apollo Beach & Tampa Bay, FL"
- Add **FAQ section** (6–8 questions): service areas, pricing, eco products, insurance, booking process, satisfaction guarantee, recurring plans
- Add **FAQPage JSON-LD schema**
- Add **Service Area section** listing all 9 cities with links to location pages
- Verify all 6 service types explicitly listed with links
- Verify Organization schema includes `areaServed` for all 9 cities
- Ensure "eco-friendly" appears naturally in 3+ distinct sections

---

## Step 5: Pillar Articles (Phase 2 — 5 articles)

Create as WordPress **posts** (not pages):

| # | Title | Words | Key Internal Links |
|---|-------|-------|--------------------|
| 5a | Best House Cleaning Services in Apollo Beach, FL | 1,500–2,500 | Apollo Beach location page, all service pages, booking |
| 5b | How Much Does House Cleaning Cost in Apollo Beach? | 1,500–2,500 | Pricing context, recurring cleaning, deep cleaning |
| 5c | Deep Cleaning vs Standard Cleaning: What Tampa Bay Homeowners Need to Know | 1,500–2,000 | Deep cleaning page, recurring cleaning page |
| 5d | Eco-Friendly Cleaning: Why Tampa Bay Families Are Making the Switch | 1,500–2,000 | Eco products page, all location pages |
| 5e | The Complete Move-Out Cleaning Checklist for Tampa Bay Renters | 1,500–2,000 | Move-in/out page, location pages |

Each article: clear H2/H3 hierarchy, FAQ section with schema, 3–5 internal links per 1,000 words.

---

## Step 6: FAQ Blocks on Service Pages

Add 4–6 unique FAQs with FAQPage schema to each service page:
- Deep Cleaning (ID: 240)
- Recurring Cleaning (ID: 244)
- Move-In/Move-Out (ID: 242)
- Post Construction (ID: 1042)
- Commercial Cleaning (ID: 238)
- Realtor Cleaning (ID: 368)

Questions must be unique per page — not duplicated from location pages.

---

## Step 7: Internal Linking Audit

After all content is created, audit all pages to ensure:
- Every location page → all 6 service pages
- Every service page → at least 3 location pages
- Every pillar article → relevant service + location pages
- Articles/blog → booking pages
- Descriptive anchor text (not "click here")
- 3–5 internal links per 1,000 words

---

## Step 8: "Best Of" Authority Page (Phase 3)

Create new WordPress page: **"Why Power Bay Cleaning Service is the Best House Cleaning in Apollo Beach"**
- 2,000–3,000 words
- Differentiators, 49-point checklist detail, process walkthrough, trust signals, client scenarios
- FAQ section with schema
- Link from homepage and all location pages

---

## Step 9: Social Content Templates & Local Listings (Phase 3)

- Create `content-calendar-template.md` with 12 reusable social post templates
- Prepare consistent business descriptions for Yelp, Angi, Thumbtack, Nextdoor with matching NAP info

---

## Verification Plan

After each page edit:
1. Run `seo-optimizer` skill — target score 75+ (80+ for Apollo Beach and homepage)
2. Fetch the live page via `WebFetch` and verify content rendered correctly
3. Validate JSON-LD schema by fetching page source and checking for `application/ld+json` blocks
4. Compare intro paragraph against all other location pages to ensure zero duplication
5. Verify word count is within target range (1,200–1,500 for location pages)
6. Verify all internal links resolve (no 404s)

End-to-end validation after all phases:
- Fetch every location page and confirm Gold Standard Checklist items are present
- Fetch homepage and confirm FAQ + service area section
- Fetch all pillar articles and confirm publishing status
- Run `seo-optimizer` across all modified pages

---

## Critical Files
- `90Day-AI-Visibility-Plan.md` — source requirements
- `brand_assets/brand-style-guide.md` — design reference
- `wp-auth.sh` + `.env` — WordPress API access
- `.claude/skills/content-creator/SKILL.md` — invoke before writing content
- `.claude/skills/seo-optimizer/SKILL.md` — invoke after each page
- `.claude/agents/wordpress-master.md` — invoke before WordPress edits
