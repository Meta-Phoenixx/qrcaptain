# Plan: Per-Run Content Angle Deduplication

## Context

Multiple emails about the same product (e.g. HighLevel) that share the same content angle (e.g. "replaces a hire") are all passing through `analyze_emails.py` and generating separate posts — even within a single run. The existing dedup is keyed on `product + key_feature`, which correctly blocks identical features across runs but does nothing when different emails about the same product share the same underlying angle. The result is 3–4 HighLevel posts all from the "replace a hire" angle, bloating the content calendar with near-identical messaging. The fix: enforce a strict one-angle-per-product rule within each run.

---

## Root Cause

In `tools/analyze_emails.py` (line 303), the dedup key is:
```python
topic_key = normalize_key(product, feature)  # product::key_feature
```
This allows multiple emails to pass if they describe *different features* but from the *same angle* for the same product.

There is no within-run angle tracking. Every email that passes the feature-level check gets a post generated.

---

## File to Modify

**`tools/analyze_emails.py`** — two targeted changes only.

---

## Change 1: Normalize content_angle to a fixed vocabulary (ANALYSIS_PROMPT)

Currently the prompt gives freeform examples. Tighten it to a fixed enum so angle comparisons are reliable:

```python
# In ANALYSIS_PROMPT, replace the content_angle instruction line:

# BEFORE:
"content_angle": "The most compelling angle for social media (e.g. 'time saving', 'cost cutting', 'competitive advantage', 'replaces a hire')"

# AFTER:
"content_angle": "Pick exactly one of these angles — choose the single best fit: time saving | cost cutting | competitive advantage | replaces a hire | replaces multiple tools | growth | marketing | security | other"
```

This ensures that Claude assigns canonical angle values (lowercase, consistent). Without this, "Replaces A Hire" and "replaces a hire" would be treated as different angles by the dedup check.

---

## Change 2: Add within-run angle dedup tracker (main function)

Add a single dict `seen_angles` that maps `product_lower → set of angles` for the current run. After the existing `covered_topics` check, add one more check before appending to `analyzed`.

**Location**: `main()` function, lines 280–325.

```python
# After line 282 (newly_covered = set()):
seen_angles: dict[str, set] = {}   # product_lower → set of angles seen this run

# After line 303 (topic_key = normalize_key(product, feature)):
# Add within-run angle dedup
content_angle = result.get("content_angle", "").lower().strip()
product_lower = product.lower().strip()
if content_angle and product_lower in seen_angles and content_angle in seen_angles[product_lower]:
    print(f"         → Angle already used for {product} ('{content_angle}') — skipping")
    skipped += 1
    continue

# After line 324 (analyzed.append(item)):
# Register the angle for this product
if product_lower not in seen_angles:
    seen_angles[product_lower] = set()
if content_angle:
    seen_angles[product_lower].add(content_angle)
```

**Key behaviors:**
- One angle per product per run (e.g. only ONE HighLevel "replaces a hire" post per run)
- Does not affect the cross-run `covered_topics` dedup (that stays unchanged)
- Required Articulate items are injected AFTER the loop so are unaffected
- The skipped item is counted in the `skipped` total (already printed in the summary line)

---

## What Does NOT Change

- `covered_topics.json` logic — untouched
- `generate_content.py` — no changes
- `save_to_monday.py` — no changes
- Required Articulate items — exempt (injected after loop, not subject to dedup)

---

## Verification

1. Run `python tools/analyze_emails.py` with the current `emails_raw.json`
2. Check console output — look for `→ Angle already used for HighLevel ('replaces a hire') — skipping` lines
3. Check `emails_analyzed.json` — HighLevel should appear at most once per unique angle
4. Run `python tools/generate_content.py` → `python tools/save_to_monday.py` and confirm no angle-duplicate posts make it to Monday
