# Plan: Celebration of Life Slideshow Gallery

## Context
Build a beautiful memorial slideshow gallery website for a celebration of life service for Karen. The site must handle 209 iOS photos (HEIC format), support two gallery display modes, an audio player, a lightbox, and inactivity-driven automation — all from a single `index.html` served by a local Node.js server.

**Key facts from exploration:**
- 209 photos in `photos/` (208 HEIC + 1 JPG, ~415MB total) — HEIC must be pre-converted to JPEG
- `music/` folder exists with 3 MP3s already placed
- No `serve.mjs`, `screenshot.mjs`, `index.html`, or `package.json` exist yet
- User confirmed: pre-convert all photos upfront; use "In Loving Memory of Karen" as title
- Must invoke `frontend-design`, `mobile-design`, and `ui-ux-pro-max` skills before building

---

## Files to Create
| File | Purpose |
|---|---|
| `package.json` | Declares `sharp` dependency |
| `process-photos.mjs` | One-time pipeline: HEIC → JPEG conversion + enhancement + compression |
| `serve.mjs` | HTTP server: static files + `/api/photos` + `/api/music` |
| `screenshot.mjs` | Puppeteer screenshot utility |
| `index.html` | Main gallery site (all styles inline) |
| `music/` | Already exists with 3 MP3s |
| `archived/` | HEIC originals moved here after processing (project root, excluded from deployment) |

---

## Step-by-Step Implementation

### Step 1 — Invoke Design Skills
Run the three required skills before writing any code:
```
npx claude-code-templates@latest --skill=creative-design/mobile-design --yes
npx claude-code-templates@latest --skill=creative-design/ui-ux-pro-max --yes
```
(frontend-design is already installed per CLAUDE.md)

### Step 2 — Setup & Dependencies
Create `package.json` with `type: "module"` and `sharp` as a dependency. Run `npm install`. Install `puppeteer` separately for screenshots.

### Step 3 — Full Image Processing Pipeline (`process-photos.mjs`)
This script runs **once** on all 209 HEIC photos, then new images go through the same pipeline when added. Steps per image:

1. **Convert HEIC → JPEG** using `sharp`
   - Auto-rotate based on EXIF orientation data (fixes sideways/upside-down photos)
   - Output to `photos/[originalname].jpg`

2. **Enhance** using `sharp` operations:
   - `normalise()` — auto-levels (spreads histogram for better contrast)
   - `modulate({ brightness: 1.05, saturation: 1.1 })` — slight brightness lift and color pop
   - `sharpen({ sigma: 0.8 })` — gentle sharpening pass

3. **Compress** using `sharp` JPEG output options:
   - `quality: 82` — high quality with significant size reduction
   - `mozjpeg: true` — uses MozJPEG encoder for better compression at same quality
   - `progressive: true` — progressive JPEG for faster perceived load
   - Resize: max 2400px on longest side if larger (preserves aspect ratio)

4. **Archive originals** — after successful processing, move the source HEIC file to `archived/[filename]`

5. **Progress reporting** — prints: `[45/209] Processing: filename.heic → filename.jpg ✓`

Run: `node process-photos.mjs`

**New image flow:** When new JPGs/HEICs are dropped into `photos/`, the server detects them via the polling endpoint. For HEIC files dropped in later, they must be run through `process-photos.mjs` again (it skips already-processed files, so it's safe to re-run). For JPGs dropped directly, the server serves them as-is after a `sharp` compression pass.

### Step 4 — Dev Server (`serve.mjs`)
Node.js HTTP server with no external dependencies beyond built-ins:

**Endpoints:**
- `GET /api/photos?since=<timestamp>` → scans `photos/` for `.jpg`/`.jpeg` files (ignoring `archived/`), returns `{ photos: string[], timestamp: number }`. The `since` param filters to only files newer than that timestamp (enables dynamic detection of newly added photos).
- `GET /api/music` → scans `music/` for `.mp3` files, returns `{ tracks: string[] }`
- `GET /photos/*` → serves JPEG files with proper `Content-Type` (excludes `archived/` subfolder)
- `GET /music/*` → serves MP3 files with `Content-Type: audio/mpeg`
- `GET /*` → serves static files from project root (index.html, etc.)

### Step 5 — Screenshot Script (`screenshot.mjs`)
Puppeteer-based, saves to `./temporary screenshots/screenshot-N.png`. Accepts optional label argument.

### Step 6 — Main Gallery (`index.html`)
Single file, all styles inline. Tailwind via CDN. Google Fonts: Cormorant Garamond (display serif) + Inter (sans).

#### Visual Theme — "Memorial Warmth"
- Background: `#080810` near-black with cool-dark depth
- Accent gold: `#c9a96e` (warm, elegant, respectful)
- Text: `#e8e0d5` warm cream
- Glass surfaces: `rgba(255,255,255,0.05)` with `backdrop-filter: blur(16px)`
- Layered radial gradients for depth; subtle SVG grain texture overlay
- No default Tailwind blue/indigo anywhere

#### On Load Sequence
1. Fetch `/api/photos` → build full image array
2. Fetch `/api/music` → build playlist, begin auto-play (respects browser autoplay policy — starts on first user interaction if blocked)
3. Initialize Mode 1 (vertical) as default, begin auto-scroll

#### State Machine
```
slideshowState: 'playing' | 'paused' | 'lightbox'
currentMode: 'vertical' | 'horizontal'
lightboxSource: 'user' | 'inactivity'
```

#### Mode 1 — Vertical Auto-Scroll (nateluebbe.com style)
- 3-column CSS masonry grid (CSS `columns: 3`, with responsive breakdowns to 2 on tablet, 1 on mobile)
- Dark background, images with subtle gold-tinted shadow
- Images lazy-loaded with `IntersectionObserver` fade-in (0.65s)
- **Auto-scroll logic:**
  1. `requestAnimationFrame` loop that increments `scrollY` by ~0.8px per frame (smooth, ~1px/16ms)
  2. When `IntersectionObserver` detects a previously-unseen image batch entering the viewport → pause scroll for 4 seconds → resume
  3. When reaching the bottom, silently reset scroll to top (seamless loop with a duplicated buffer of images)

#### Mode 2 — Horizontal Slideshow (themarcus.com style)
- Full-screen single image at a time
- Ken Burns effect via CSS `@keyframes` (subtle scale 1.0→1.08 + slight pan, 10s duration, `transform` only)
- Crossfade transition: outgoing image fades from opacity 1→0, incoming 0→1, both absolutely positioned, 1.5s ease
- Auto-advance every 6 seconds

#### Control Toolbar (bottom-right, floating)
Glass-morphism pill: `backdrop-filter: blur(20px)`, warm gold border `rgba(201,169,110,0.3)`.

Layout:
```
[ ⏸/▶ Slideshow ] [ ⇅ / ⇄ Mode ]   [ ⏮ ] [ ⏸/▶ Audio ] [ ⏭ ] [ ♪ track name ]
```
- Every button has hover (gold glow), focus-visible (ring), and active (scale-down) states
- Mode button label shows current mode name and toggles icon direction (↕ = vertical, ↔ = horizontal)
- Track name scrolls via CSS marquee animation if too long

#### Lightbox
- Full-screen fixed overlay: `rgba(0,0,0,0.92)` backdrop
- Image centered, `max-width: 90vw; max-height: 90vh; object-fit: contain`
- Warm gold close button (×) top-right
- Slide-in animation: image scales from 0.95→1.0, 0.3s spring easing
- Close triggers: click overlay, Escape key, 10s inactivity timer (mousemove/touch resets timer)
- On close: resume slideshow from current position

#### Inactivity System
Two independent timers, both reset on `mousemove`, `keydown`, `touchstart`, `click`:
1. **Lightbox inactivity (10s):** Only active while lightbox is open. Fires → close lightbox → resume slideshow.
2. **Global inactivity (30s):** Only active while slideshow is playing (not paused, not lightbox-open). Fires → pick random image from array → open lightbox with `lightboxSource = 'inactivity'` → start 5s auto-close timer → close → resume. This 5s timer is NOT reset by user activity (it always closes after 5s).

#### Dynamic Image Loading
- After initial load, poll `/api/photos?since=<lastTimestamp>` every 30 seconds
- New images returned → appended to image array
- Mode 1: new images added to masonry DOM at the bottom
- Mode 2: new images shuffled into the rotation queue

#### Audio Player
- On load: fetch `/api/music` → build ordered playlist
- `<audio>` element hidden in DOM, controlled via JS
- Auto-plays on mount; if browser blocks autoplay, plays on first user click anywhere
- Controls in toolbar: ⏮ (prev), ⏸/▶ (toggle), ⏭ (next)
- Playlist loops: when last track ends, wraps back to track 1
- Track name displays in toolbar

---

## Verification Steps
1. `npm install` succeeds, `sharp` installed
2. `node process-photos.mjs` → all 209 photos processed to `photos/*.jpg`, originals moved to `archived/`
3. `node serve.mjs` → server starts, visit `http://localhost:3000/api/photos` → returns JSON with 209+ entries
4. `node serve.mjs` → visit `http://localhost:3000/api/music` → returns 3 track names
5. `node screenshot.mjs http://localhost:3000` → screenshot saved, read and compare against design intent
6. Screenshot round 2 after any fixes
7. Manual test: click image → lightbox opens, slideshow pauses; click outside → resumes
8. Manual test: leave idle 30s → random image auto-opens, closes after 5s → slideshow resumes
9. Manual test: mode switch button → transitions from vertical scroll to horizontal slide and back
10. Manual test: audio controls → play/pause/skip work, playlist loops
11. Manual test: add a new processed JPG to `photos/` → within 30s polling it appears in slideshow
12. Confirm `archived/` contains all original HEIC files and `photos/` contains only JPEGs
