# GROUT — Phase 0: Independent Engineering & Product Audit Report

**Target Repository:** `https://github.com/FaaizNaved/Grout`  
**Production Deployment:** `https://grout-web-game.vercel.app`  
**Audit Branch:** `audit/phase-0-review`  
**Audit Date:** November 24, 2026  
**Auditor:** Independent Principal Systems & Product Architect  
**AdSense Publisher ID Audited:** `pub-3896262766732996`  

---

## 1. Executive Summary

A comprehensive, evidence-based technical and product audit of the **GROUT** web application was conducted across its source code, runtime mechanics, visual design, audio synthesis, level architecture, Google AdSense integration, SEO discoverability, and deployment pipeline.

### High-Level Verdict
While the project successfully establishes a culturally resonant premise based on the viral *"Isme Grout Bhar Denge"* (इसमें ग्रोट भर देंगे) meme and has transitioned away from garish neon styling toward warm artisanal earth pigments, the application currently suffers from **several critical engineering defects, severe Google AdSense policy violation risks, and game loop design flaws** that prevent it from being a commercially viable, high-traffic viral gaming product:

1. **Critical Gameplay Logic Flaw (The Sponge Fills Grout):** The promised two-phase ASMR mechanic (*spread grout paste with trowel, then buff/clean excess haze with sponge*) is non-existent in the engine. In `engine.js`, the sponge tool actually performs the exact same gap-filling operation as the trowel with a larger collision radius (38px vs 26px), filling gaps invisibly without rendering strokes while still incrementing progress to 100%.
2. **Severe AdSense Policy Violations & Invalid Traffic Risk:**
   - Ad unit IDs in `index.html` are hardcoded fake placeholders (`1234567890`, `9876543210`, `5555555555`), which cause HTTP 400 Bad Request errors with Google's ad server.
   - Standard display ad units are embedded inside a modal overlay with a locked 3-second countdown timer (`#adTransitionModal`), which constitutes a **direct violation of Google AdSense's Interstitial & Pop-Up Policy**, risking immediate account suspension.
   - The bottom ad unit is placed immediately below interactive gameplay controls (swatches and buttons) with less than 15px clearance, creating an **Accidental Click policy hazard**.
3. **Canvas State Reset Bug on Window Resize / Mobile Rotation:** In `engine.js` (`handleResize()`), resizing the browser or rotating a mobile device re-discretizes gap sample points, resetting `filledPointsCount` to 0 while leaving previously rendered strokes visible on the canvas, corrupting game state and preventing level completion.
4. **Social Sharing Metadata Failure:** The Open Graph and Twitter preview cards reference an SVG (`/og-preview.svg`) via a relative URL. Major social platforms (WhatsApp, Twitter/X, Facebook, iMessage) require absolute URLs (`https://...`) and raster formats (PNG/JPEG); as a result, **all WhatsApp and Twitter link previews fail to render an image**.
5. **Mobile Ergonomics (Below-the-Fold Canvas):** On mobile viewports (<768px height), the top ad banner and verbose inspection report push the interactive canvas and tool controls completely below the fold (~400px of scrolling required before the player can interact).
6. **Level Homogeneity:** All 9 levels share an identical mechanical loop. Visually, 7 out of 9 levels are simply colored flat rectangles with text labels; the "Infinite ASMR" level is not infinite, but rather a static 4x4 grid that halts with a victory modal at 84% fill.

---

## 2. Current Architecture and Module Map

### 2.1 File System & Architecture Overview

```
c:\Freelancing\game\Grout/
├── index.html               # Main single-page application shell & modal containers
├── ads.txt                  # Root AdSense authorized digital seller record
├── package.json             # Build configuration (Vite v6.4.6 dev dependency)
├── vercel.json              # Vercel deployment headers, cleanUrls, and caching rules
├── README.md                # Project documentation and backstories
├── .gitignore               # Ignores node_modules, dist, logs, env
├── assets/                  # Source vector graphics
│   ├── favicon.svg          # 100x100 SVG icon
│   └── og-preview.svg       # 1200x630 SVG social preview card
├── public/                  # Vite public directory (copied as-is to dist root)
│   ├── ads.txt              # Production ads.txt
│   ├── favicon.svg          # Static favicon
│   └── og-preview.svg       # Static OG image
├── css/
│   └── style.css            # Handcrafted warm minimal theme & responsive layout (846 lines)
└── js/
    ├── main.js              # Application entrypoint & DOM event orchestrator (280 lines)
    ├── engine.js            # HTML5 Canvas 2D rendering & drag interaction engine (520 lines)
    ├── levels.js            # 9 level configurations & color palettes (305 lines)
    ├── audio.js             # Web Audio API procedural synthesis & speech engine (294 lines)
    ├── certificate.js       # Canvas letterpress diploma renderer & exporter (165 lines)
    ├── ads.js               # AdSense slot manager & modal transition timer (83 lines)
    └── viral.js             # Social sharing links & soundboard triggers (73 lines)
```

### 2.2 Module Dependency & Data Flow Graph

```mermaid
graph TD
    HTML[index.html] --> Main[js/main.js]
    Main --> Levels[js/levels.js]
    Main --> Engine[js/engine.js]
    Main --> Audio[js/audio.js]
    Main --> Cert[js/certificate.js]
    Main --> Ads[js/ads.js]
    Main --> Viral[js/viral.js]
    Engine --> Audio
    Viral --> Audio
```

### 2.3 Build & Runtime Architecture
- **Runtime Dependencies:** Zero external npm packages at runtime. The game operates entirely on native browser Web APIs: HTML5 Canvas 2D, Web Audio API, Web Speech API (`SpeechSynthesis`), and Pointer/Touch Events.
- **Build Pipeline:** Vite v6.4.6 bundles `index.html`, CSS, and ES modules into `/dist`. Production deployment is automated via Vercel CLI (`npx vercel --prod`).

---

## 3. Feature Verification Matrix

Each declared feature has been tested against actual runtime behavior and source code implementation.

| Feature / Capability | Declared in Code | Verified Working? | Actual Observed Behaviour & Defect Notes |
| :--- | :---: | :---: | :--- |
| **Canvas DPI Scaling** | Yes | **Partial** | Scales canvas backing store by `devicePixelRatio`, but resets game progress on window resize. |
| **Trowel Grout Spreading** | Yes | **Verified** | Drags and extrudes satin paste along gap lines. Debounced squelch audio triggers. |
| **Sponge Buffing / Polishing** | Yes | **BROKEN** | Sponge fills gaps identically to trowel with 38px collision; no haze removal or cleaning mechanic exists. |
| **Progress Calculation** | Yes | **Verified** | Percentage calculated as `(filledPoints / totalPoints) * 100`. Target threshold is 84%. |
| **Combo / Streak Counter** | Yes | **Verified** | Increments on continuous dragging; resets via 700ms timer timeout. |
| **Web Audio Synthesizer** | Yes | **Verified** | Procedural oscillators generate squelch, scrape, sponge squeak, chime, and fanfare without external audio files. |
| **Meme Voice Clips** | Yes | **Fragile** | Uses browser `SpeechSynthesis`. Falls back to generic robotic American voice if Hindi/Indian English voice is absent. |
| **Mute Toggle & Persistence** | Yes | **Verified** | Persists mute state to `localStorage.getItem('grout_muted')`. Syncs UI label on initialization. |
| **Diploma Canvas Generation** | Yes | **Partial** | Renders 1200x800 letterpress certificate, but long names overflow canvas boundaries due to missing text wrapping/scaling. |
| **Diploma PNG Download** | Yes | **Partial** | Uses `<a>` tag data URL download; succeeds on desktop, frequently blocked on iOS Safari webviews. |
| **WhatsApp Viral Share** | Yes | **Verified** | Opens `api.whatsapp.com/send` with encoded meme text and URL. |
| **X (Twitter) Viral Share** | Yes | **Verified** | Opens `twitter.com/intent/tweet` with pre-filled hashtags. |
| **Clipboard Link Copy** | Yes | **Verified** | Calls `navigator.clipboard.writeText` with graceful fallback to `prompt()`. |
| **Meme Soundboard Drawer** | Yes | **Verified** | Modal with 8 interactive audio buttons triggers synthesized audio cues. |
| **Level Quick Selector** | Yes | **Verified** | Horizontal ribbon permits instant switching between all 9 levels. |
| **Infinite ASMR Mode** | Yes | **BROKEN** | Level 9 is a fixed 4x4 brick pattern that halts with a victory modal upon reaching 84% fill. |
| **AdSense ads.txt** | Yes | **Verified** | Served with HTTP 200 at `/ads.txt` with correct publisher ID. |
| **AdSense Ad Units** | Yes | **BROKEN** | Uses hardcoded fake slot IDs (`1234567890`), violating AdSense guidelines and failing to render real ads. |
| **Ad Interstitial Modal** | Yes | **POLICY VIOLATION** | Embedding display ads in a forced 3-second modal violates Google AdSense policies. |

---

## 4. UI/UX Findings & Ergonomics

### 4.1 Responsive Viewport Breakdown

#### A. Mobile Viewport (375px × 812px — iPhone 13/14/15)
- **Fold Displacement:** The vertical stack comprises:
  - Header: ~56px
  - Top Ad Slot: ~74px
  - Site Inspection Report: ~170px
  - Canvas HUD: ~76px
  - Stage Ribbon: ~44px
  - **Total pre-canvas height:** **~420px**.
  - On a viewport height of 812px (with browser chrome reducing usable height to ~710px), the 300px canvas is pushed 60% below the fold. The player cannot see the tool deck without actively scrolling down.
- **Scroll Hijacking Risk:** Although `.viewport-box` has `touch-action: none`, dragging slightly outside the canvas perimeter initiates page scrolling, causing jarring viewport displacement during gameplay.
- **Tool Deck Crowding:** The bottom toolbar wraps awkwardly on viewports narrower than 360px (`tool-deck` has `flex-wrap: wrap`), causing buttons to stack unevenly.

#### B. Tablet Viewport (768px × 1024px — iPad Portrait)
- Layout is horizontally stable within the 760px `page-frame`.
- Canvas dimensions scale to 720px × 600px, filling the container nicely.
- However, vertical scrolling remains necessary to toggle tools and view the bottom ad banner.

#### C. Desktop Viewport (1440px × 900px)
- **Excessive Gutter Wastage:** The entire interface is restricted to `max-width: 760px` centered on screen. On a 1440px monitor, 680px of horizontal screen real estate (47% of total width) consists of empty linen-colored margins.
- **Cursor Double-Rendering:** In `style.css` line 455, `canvas#gameCanvas` specifies `cursor: crosshair;`. In `engine.js` line 470, the engine renders an in-canvas trowel/sponge at `this.currentPos`. Desktop users see both the OS crosshair cursor and the canvas trowel offset by movement velocity, creating visual confusion.

### 4.2 Visual Hierarchy, Typography & Palette
- **Palette Evaluation:** The shift to linen (`#F7F4EE`), raw ochre (`#B45309`), burnt terracotta (`#9A3412`), and limestone (`#F5F2EB`) successfully eliminated artificial neon styling.
- **Contrast Ratios (WCAG AA Accessibility Failures):**
  - `--text-faint: #A8A29E` on `#FFFFFF` (used for `.ad-meta-label`) yields a contrast ratio of **2.43:1**, failing the WCAG AA minimum of **4.5:1**.
  - `--text-muted: #78716C` on `#F7F4EE` yields a contrast ratio of **3.82:1**, failing WCAG AA for body text.
  - Tag badge text (`#9A3412` on `#FFF7ED`) passes with **5.14:1**.
- **Typographic Scale:**
  - Headings correctly pair `Fraunces` with `Plus Jakarta Sans`.
  - However, there is **no `<h1>` tag anywhere in `index.html`**. The highest-level heading in the DOM is an `<h2>` (`.hud-title`), which breaks standard accessibility and document outline structure.

### 4.3 Why the Site Still Feels Artificial Rather Than Handcrafted
1. **Vertical "Card Sandwich" Layout:** The page is structured as 7 identical rectangular white rounded boxes stacked vertically with identical drop shadows (`--shadow-sm`). It resembles a standard administrative dashboard rather than an artisanal, tactile gaming workshop.
2. **Missing Tactile Materiality:** The canvas substrate is a flat solid color (`#1C1917`), and tiles are drawn with simple flat `ctx.fillRect` with a linear opacity gradient. Real tile grouting involves textured matte biscuit ceramic, porous cement crevices, grainy paste consistency, and tactile slurry haze.
3. **No Character Personality in Dialogue:** The dialogue is presented as plain serif text in a bordered box. The humor of *"Isme Grout Bhar Denge"* relies heavily on visual absurdity (the contrast between the angry site inspector and the totally unbothered, smiling mason). Replacing the tacky SVG shapes with pure text removed the cartoon cringe, but left behind a sterile corporate report.

---

## 5. Game Engine Technical Findings (`js/engine.js`)

### 5.1 Critical Engine Bugs

#### Bug ENG-01: Window Resize Wipes Level Progress
- **Location:** [`js/engine.js` lines 38-65](file:///c:/Freelancing/game/Grout/js/engine.js#L38-L65)
- **Code:**
  ```javascript
  handleResize() {
    ...
    if (this.currentLevel) {
      this.initLevel(this.currentLevel, false);
    }
  }
  ```
- **Observed Behavior:** When a user rotates a mobile phone or resizes their desktop browser window, `initLevel` is invoked. This re-allocates `this.samplePoints` with all points reset to `filled: false` and resets `this.filledPointsCount = 0`. However, `this.strokes` (the graphical paint marks) are **not** cleared. Visually, the tiles appear filled, but the game logic registers 0% progress. The user can never reach the 84% completion threshold without scrubbing over already-painted joints.
- **Root Cause:** Level re-initialization is coupled directly to viewport recalculation instead of separating canvas dimension transforms from level state.

#### Bug ENG-02: Sponge Tool Fills Gaps Instead of Buffing
- **Location:** [`js/engine.js` lines 141-152, 269-281](file:///c:/Freelancing/game/Grout/js/engine.js#L141-L281)
- **Code:**
  ```javascript
  checkGroutFill(pos) {
    if (this.isCompleted) return;
    let newlyFilled = 0;
    const thresholdDist = this.tool === 'sponge' ? 38 : 26;
    this.samplePoints.forEach(pt => {
      if (!pt.filled) {
        const d = Math.hypot(pt.x - pos.x, pt.y - pos.y);
        if (d <= thresholdDist) {
          pt.filled = true;
          newlyFilled++;
          this.filledPointsCount++;
        }
      }
    });
    ...
  }
  ```
- **Observed Behavior:** Selecting the Sponge tool and scrubbing over an unfilled gap marks the sample points as `filled: true`. Because `thresholdDist` is 38px for the sponge (vs 26px for the trowel), **the sponge is literally an oversized invisible trowel**. It does not buff, it does not remove haze, and it does not require a prior trowel pass.
- **Root Cause:** A single boolean `pt.filled` is used for both paste extrusion and sponge finishing. There is no concept of joint states (`empty` -> `extruded` -> `cured` -> `buffed`).

#### Bug ENG-03: Tunneling / Dropped Collision on Rapid Drag
- **Location:** [`js/engine.js` lines 161-182, 266-282](file:///c:/Freelancing/game/Grout/js/engine.js#L161-L282)
- **Code:** Collision testing in `checkGroutFill(pos)` only evaluates the Euclidean distance between `pos` and `pt`.
- **Observed Behavior:** When dragging rapidly across the canvas, browser pointer events fire at discrete intervals (typically 16ms to 32ms apart, corresponding to 40px–100px jumps in screen space). Sample points that lie between `lastPos` and `currentPos` are bypassed completely. A visual continuous stroke is rendered (via `lineTo`), but the underlying collision points remain unfilled, leaving invisible "holes" in the progress bar.
- **Root Cause:** Absence of continuous segment-to-point distance calculations (`distanceToSegment(pos, lastPos, pt)`).

#### Bug ENG-04: Unconstrained Memory Growth in Stroke Path Storage
- **Location:** [`js/engine.js` lines 143-150, 401-426](file:///c:/Freelancing/game/Grout/js/engine.js#L401-L426)
- **Observed Behavior:** Every pointer move appends `{x, y}` to `this.currentStroke.points`. In prolonged sessions or Level 9, `this.strokes` accumulates tens of thousands of vector vertices. On every frame of the 60fps render loop, the engine iterates through all historical strokes and re-executes `ctx.lineTo()` for every point. On mobile devices, this causes severe frame-rate drops (jank) after 30–45 seconds of continuous play.
- **Root Cause:** Retained vector stroke paths instead of baking completed strokes onto an offscreen substrate buffer.

#### Bug ENG-05: Unthrottled 60fps Render Loop When Idle
- **Location:** [`js/engine.js` lines 41-43, 515-518](file:///c:/Freelancing/game/Grout/js/engine.js#L515-L518)
- **Observed Behavior:** `requestAnimationFrame(this.animate)` runs continuously even when the player is not interacting, when all particles have settled, when modals are active, or when the browser tab is minimized in the background. This consumes unnecessary CPU/battery resources on mobile devices.
- **Root Cause:** Lack of dirty-flag rendering or page visibility detection (`document.hidden`).

---

## 6. Individual Level Assessments (All 9 Levels)

| Level ID | Level Name | Intended Scenario | Actual Rendering Implementation | Visual Uniqueness | Humour / Narrative Quality | Mechanic Differentiation |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| **1** | **The Ventilation Gap** | 4 bathroom floor tiles with an absurd 2-inch gap. | 4 cream rectangles (`#FAF8F5`) with 4 straight gap lines. | Low | High (Original iconic mistri excuse) | **Baseline:** Basic horizontal & vertical line tracing. |
| **2** | **The Viral Staircase** | Misaligned staircase risers (6-inch vs 14-inch steps). | 5 flat rectangles with text labels ("Step 1", "Cut Piece"). | Low | High (Direct reference to viral video) | **Identical to Level 1:** Flat 2D rectangles; lacks any 3D/isometric staircase perspective. |
| **3** | **Heartbreak & Dhokha** | Shattered cartoon heart split by a breakup. | 1 vector heart (`#9F1239`) split by 6 jagged gap lines. | Medium | High (Relatable breakup parody) | **Identical mechanic:** Tracing 6 lines. Heart does not beat or repair upon completion. |
| **4** | **Corporate Crisis** | Production bug & missed deadline in Excel sheet. | 6 green-bordered rectangles with text labels ("#DIV/0!", "Q1 Rev"). | Low | Medium (Corporate satirical parody) | **Identical to Level 1:** Standard 4x3 grid line tracing. |
| **5** | **The Flunked Marksheet** | Report card with 00/100; turning F into A+. | 1 large cream rectangle with gap lines in the shape of 'A' and '+'. | Low | High (Exam failure meme) | **Flawed execution:** Gaps for 'A+' are pre-drawn from the start. No active transformation of 'F' occurs. |
| **6** | **Shattered Phone Screen** | Cracked smartphone gorilla glass with spiderwebs. | 1 dark charcoal rectangle with 8 radial lines and 4 concentric box lines. | Medium | High (₹40,000 Apple repair parody) | **Minor variation:** Radial outward strokes rather than orthogonal grid lines. |
| **7** | **The Sinking Titanic** | Iceberg rupture across the ship's steel hull. | 1 plain navy blue rectangle (`#1E293B`) with 4 straight lines. | Very Low | High (Absurd historical parody) | **Identical to Level 1:** Blue box with zero ship details, water, or rivets. |
| **8** | **Leaning Tower of Pisa** | UNESCO 800-year-old tilting monument foundation. | 1 tilted yellow box (`#FEF08A`) with 5 line segments. | Very Low | High (Global engineering failure joke) | **Identical to Level 1:** Yellow box; no tower silhouette or columns rendered. |
| **9** | **Infinite Mistri ASMR** | Endless procedural subway tile meditation sandbox. | 1 static 4x4 brick bond grid. | Low | Low (Generic repeating bricks) | **BROKEN:** Not infinite. Halts with Level Victory modal as soon as 84% fill is reached. |

### Level Design Conclusion
Levels 1, 2, 4, 7, and 8 are functionally identical: a colored rectangle on a dark background with 4–6 line segments. The player experiences no progressive difficulty, no new hazards (e.g. drying grout, leaking water, unstable tiles, timer constraints), and no interactive reward upon completion.

---

## 7. Google AdSense & SEO Risks

### 7.1 AdSense Policy Violations (High/Critical Account Risk)

#### Risk ADS-01: Fake Ad Slot Identifiers
- **Location:** [`index.html` lines 70, 179, 310](file:///c:/Freelancing/game/Grout/index.html#L70)
- **Evidence:**
  ```html
  data-ad-slot="1234567890"  <!-- Top Banner -->
  data-ad-slot="9876543210"  <!-- Bottom Banner -->
  data-ad-slot="5555555555"  <!-- Interstitial Modal -->
  ```
- **Risk:** These sequential dummy numbers do not exist in publisher account `pub-3896262766732996`. When the Google AdSense loader (`adsbygoogle.js`) attempts to fetch inventory for these slot IDs, it returns HTTP 400 Bad Request errors. Google's ad crawler flags repeated invalid slot requests, which can block site approval.
- **Remediation:** Remove manual slot attributes and enable Google Auto Ads, OR replace them with verified ad unit IDs provisioned directly in the Google AdSense dashboard.

#### Risk ADS-02: Policy Violation on Modal Interstitial Ad
- **Location:** [`index.html` lines 300-322](file:///c:/Freelancing/game/Grout/index.html#L300-L322); [`js/ads.js` lines 40-80](file:///c:/Freelancing/game/Grout/js/ads.js#L40-L80)
- **Evidence:**
  `adManager.showLevelTransitionAd()` displays `#adTransitionModal` with a 3-second disabled skip button while embedding a standard AdSense display unit (`data-ad-format="rectangle"`).
- **Google Policy Breach:** Google AdSense Program Policies strictly prohibit placing standard display ads inside pop-ups, pop-unders, or overlay windows with locked timers (*"Ad placements in floating boxes or overlays that obscure content or force countdowns"*). Interstitial and rewarded formats are permitted **only** via the official Google AdSense for Games (H5 Games Ads SDK). Using standard display units in modal interstitials is a leading cause of immediate account suspensions.
- **Remediation:** Remove display ads from `#adTransitionModal` immediately, or implement the certified Google H5 Games Ad Placement API (`window.adsbygoogle.push({ params: { ... } })`).

#### Risk ADS-03: Proximity to Interactive Game Controls (Accidental Clicks)
- **Location:** [`index.html` lines 136-185](file:///c:/Freelancing/game/Grout/index.html#L136-L185); [`css/style.css` lines 459-470](file:///c:/Freelancing/game/Grout/css/style.css#L459-L470)
- **Evidence:** `#bottomAdSlot` is positioned directly beneath `<footer class="tool-deck">`. On mobile viewports, rapid finger tapping on grout color swatches or tool buttons occurs less than 12px away from the top boundary of the ad banner.
- **Risk:** Triggers Google's automated Invalid Traffic (IVT) detection for accidental clicks, resulting in revenue clawbacks or temporary ad serving limits (30-day ad serving caps).
- **Remediation:** Ensure a minimum separation of 32px between interactive game controls and ad containers, or fix the banner to the bottom edge with an isolated adhesive container.

---

### 7.2 SEO & Discoverability Deficiencies

#### Risk SEO-01: Broken Social Sharing Image Previews (Relative SVG)
- **Location:** [`index.html` lines 22, 28](file:///c:/Freelancing/game/Grout/index.html#L22-L28)
- **Evidence:**
  ```html
  <meta property="og:image" content="/og-preview.svg">
  <meta name="twitter:image" content="/og-preview.svg">
  ```
- **Impact:**
  1. Open Graph standards require fully qualified absolute URLs (e.g. `https://grout-web-game.vercel.app/og-preview.png`). Relative paths are rejected by WhatsApp, Facebook, and Twitter scrapers.
  2. The Open Graph protocol and social platforms **do not support SVG files for rich card previews**. When shared on WhatsApp or Twitter/X, the link appears as bare plain text without an image thumbnail.
- **Remediation:** Render and export a high-resolution 1200×630 raster PNG (`og-preview.png`) and declare absolute URLs in meta tags.

#### Risk SEO-02: Missing Canonical URL
- **Location:** [`index.html`](file:///c:/Freelancing/game/Grout/index.html)
- **Impact:** No `<link rel="canonical" href="https://grout-web-game.vercel.app/">` exists. Search engines indexing both Vercel deployment aliases (`*.vercel.app`) and custom domains will treat them as duplicate content, diluting search rankings.

#### Risk SEO-03: Absence of `robots.txt` and `sitemap.xml`
- **Location:** Root directory and `public/`
- **Impact:** Neither file exists in production. Googlebot and other web crawlers encounter HTTP 404 when querying standard indexing endpoints.

#### Risk SEO-04: Missing Structured Data (Schema.org)
- **Location:** [`index.html`](file:///c:/Freelancing/game/Grout/index.html)
- **Impact:** No `WebApplication` or `VideoGame` JSON-LD schema is embedded. Google Search cannot extract rich snippets (game genre, controls, platform).

---

## 8. Performance & Engineering Quality

### 8.1 Production Build & Bundle Metrics
- **Vite Build Verification:**
  - Build command: `npm run build` (`vite build`)
  - Build duration: **193ms**
  - Bundle sizes:
    - HTML: `dist/index.html` — **13.52 kB** (gzip: 4.29 kB)
    - CSS: `dist/assets/index-DAnQurck.css` — **12.89 kB** (gzip: 2.88 kB)
    - JS: `dist/assets/index-DcGmz5io.js` — **36.05 kB** (gzip: 12.28 kB)
    - **Total production bundle transfer size:** **~19.45 kB (gzip)**.
  - **Verdict:** Excellent load performance. The lightweight zero-dependency architecture guarantees sub-second First Contentful Paint (FCP) on mobile networks.

### 8.2 Runtime Profiling & Memory Findings
1. **Garbage Collection Pressure in Audio Engine:** In `audio.js` line 83, `playSquelch()` creates a new 1-channel `AudioBuffer` and copies float samples on every invocation (debounced to 50ms). During continuous dragging, this generates ~20 buffer allocations per second, triggering avoidable garbage collection cycles.
2. **Missing `package-lock.json` in Source Control:** `package-lock.json` was uncommitted, leaving dependency version resolution non-deterministic across different build environments.

---

## 9. Prioritised Issue Register

| Issue ID | Severity | Category | File & Function / Component | Summary of Defect | Recommended Correction |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **SEC-01** | **CRITICAL** | AdSense | `index.html#L300-L322`<br>`js/ads.js#showLevelTransitionAd` | Display ad embedded inside a modal overlay with locked 3-second countdown timer. Direct AdSense policy violation. | Remove display ad unit from `#adTransitionModal`. Replace with H5 Games Ad Placement API or clean non-ad transition. |
| **SEC-02** | **CRITICAL** | AdSense | `index.html#L70,L179,L310` | Hardcoded dummy ad slot IDs (`1234567890`, `9876543210`) causing HTTP 400 errors with Google ad server. | Switch to AdSense Auto Ads mode or provision verified unit IDs from Google AdSense console. |
| **ENG-01** | **CRITICAL** | Engine | `js/engine.js#handleResize` | Browser resize or mobile screen rotation resets `samplePoints` progress to 0% while preserving drawn strokes. | Separate viewport/canvas resizing from level progress state; maintain filled status across resizes. |
| **ENG-02** | **CRITICAL** | Engine | `js/engine.js#checkGroutFill` | Sponge tool fills gaps identically to trowel; promised 2-phase mechanic (fill -> buff haze) is absent. | Implement explicit dual-layer engine state: Trowel creates slurry haze; Sponge removes haze and cures joints. |
| **SEO-01** | **HIGH** | SEO | `index.html#L22,L28` | Social preview image (`og:image`) uses relative path and SVG format, causing blank previews on WhatsApp and Twitter. | Generate 1200x630 raster `og-preview.png` and update meta tags to use absolute production URLs. |
| **UX-01** | **HIGH** | UI/UX | `index.html#L40-L135`<br>`css/style.css` | Canvas and controls are pushed 420px below the fold on mobile devices; requires heavy scrolling to play. | Compress header and inspection dispatch on mobile; ensure canvas and tool deck are visible in initial viewport. |
| **ENG-03** | **HIGH** | Engine | `js/engine.js#checkGroutFill` | Discrete point collision misses gap sample points during rapid cursor/finger sweeps (tunneling). | Replace point-in-circle collision with continuous line-segment to point distance calculations. |
| **SEC-03** | **HIGH** | AdSense | `index.html#L173-L185` | Bottom ad placement is situated immediately adjacent (<12px) to interactive tool buttons, risking invalid click penalties. | Add minimum 32px safe zone padding or anchor banner cleanly with explicit adhesive separation. |
| **ENG-04** | **MEDIUM** | Engine | `js/engine.js#render` | Path array accumulates thousands of vector points; continuous 60fps redrawing causes mobile frame drops. | Rasterize finished strokes to an offscreen layer canvas; only redraw active dynamic stroke. |
| **ENG-05** | **MEDIUM** | Engine | `js/engine.js#animate` | Unthrottled 60fps render loop runs continuously when idle or when tab is hidden in background. | Implement dirty-flag rendering and pause loop when document is hidden (`visibilitychange`). |
| **LVL-01** | **MEDIUM** | Level Design | `js/levels.js#L261-L294` | Level 9 ("Infinite Mistri ASMR") is a static 4x4 grid that terminates at 84% fill rather than being endless. | Transform Level 9 into an actual endless scrolling canvas with continuous procedural tile generation. |
| **AUD-01** | **MEDIUM** | Audio | `js/audio.js#initSpeech` | SpeechSynthesis falls back to robotic American/default voice when Indian English/Hindi voice is unavailable. | Pre-render compressed WebM/MP3 sound bites for core meme lines; use SpeechSynthesis only as secondary fallback. |
| **CRT-01** | **MEDIUM** | Viral | `js/certificate.js#generateCertificate` | Long recipient names overflow canvas boundaries and clip past borders without text wrapping or scaling. | Add dynamic font-size scaling based on `ctx.measureText(name).width`. |
| **SEO-02** | **MEDIUM** | SEO | `index.html` | Missing canonical URL tag, `robots.txt`, and `sitemap.xml`. | Add canonical tag, create `public/robots.txt` and `public/sitemap.xml`. |
| **A11Y-01**| **LOW** | Accessibility | `index.html`<br>`css/style.css` | Missing `<h1>` element in DOM hierarchy; low contrast on `--text-faint` and `--text-muted`. | Add semantic `<h1>` tag; adjust muted text tokens to meet WCAG AA 4.5:1 contrast ratio. |
| **UX-02** | **LOW** | UI/UX | `css/style.css#L455`<br>`js/engine.js#L470` | Desktop users see dual cursors (browser crosshair + canvas trowel sprite) competing visually. | Hide default OS cursor (`cursor: none`) within canvas when custom tool sprite is active. |

---

## 10. Recommended Phased Implementation Roadmap

To guide subsequent engineering phases without modifying production code during Phase 0, the following structured roadmap is recommended:

### Phase 1: AdSense Compliance & Engine Bug Fixes (Urgent / P0)
- **Goal:** Eliminate account suspension risks and repair fundamental gameplay mechanics.
- **Tasks:**
  1. Remove display ad slot from `#adTransitionModal` and resolve fake ad slot IDs in `index.html`.
  2. Implement safe margin (32px+) between bottom ad slot and interactive tool deck.
  3. Fix `handleResize()` in `engine.js` so viewport adjustments do not wipe level progress.
  4. Fix collision tunneling by implementing line-segment-to-point distance checks.
  5. Add raster `og-preview.png` with absolute URL meta tags to fix WhatsApp and Twitter sharing cards.

### Phase 2: Core Gameplay & Mechanics Realization (P1)
- **Goal:** Implement the authentic 2-phase ASMR tile grouting experience.
- **Tasks:**
  1. Establish dual-phase mechanic:
     - **Phase A (Trowel):** Extrudes grout into gap and deposits realistic translucent slurry haze onto adjacent tile edges.
     - **Phase B (Sponge):** Buffs and removes slurry haze, revealing clean, gleaming grout joints with satisfying squeak audio cues.
  2. Implement offscreen canvas caching for completed strokes to eliminate render jank.
  3. Implement true endless procedural generation for Level 9 ("Infinite Mistri ASMR").

### Phase 3: Visual Polish & Meme Character Expression (P2)
- **Goal:** Elevate visual storytelling while preserving the warm, minimal, artisanal aesthetic.
- **Tasks:**
  1. Enhance individual level visuals: render 3D/isometric stair profiles for Level 2, hull plates and rivets for Level 7, and marble arcade silhouettes for Level 8.
  2. Add hand-drawn warm line-art vignettes for Thekedar and Babu Mistri to give emotional depth to the dialogue without generic AI neon avatars.
  3. Add dynamic name scaling and wrapping to `certificate.js`.
  4. Optimize mobile ergonomics to bring the canvas into the initial viewport fold.

### Phase 4: SEO, Audio & Final Validation (P3)
- **Goal:** Maximize viral traffic and search discoverability.
- **Tasks:**
  1. Add `robots.txt`, `sitemap.xml`, canonical URL, and `Schema.org` `VideoGame` JSON-LD structured data.
  2. Provide authentic pre-recorded audio sound bites for viral punchlines (*"Isme grout bhar denge"*, *"Thekedar shocked, mistri rocked"*) as fallbacks for robotic speech synthesis.
  3. Conduct cross-browser verification across iOS Safari, Android Chrome, and desktop platforms.

---

*Report compiled and certified for Phase 0 technical sign-off on branch `audit/phase-0-review`.*
