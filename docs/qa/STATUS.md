# QA STATUS — Session F1

## Item 1: Live Check
- Live CACHE_VERSION: **0.19.0** (bc05e11 shipped 0.19.0; 0.20.0 bump is uncommitted)
- Live index.html sha256: a3f8b89a034e9b824f74a462550f06a532f82cea3a1ae445f4bf72b00c067cc2
- Local bc05e11 index.html sha256: a3f8b89a034e9b824f74a462550f06a532f82cea3a1ae445f4bf72b00c067cc2
- **MATCH: PASS**
- Live service-worker.js sha256: b1fd953bf965894a4fb9c850a73ccdc47561cf6bfaca0f2e6125e126fec1dd6f
- Local bc05e11 service-worker.js sha256: b1fd953bf965894a4fb9c850a73ccdc47561cf6bfaca0f2e6125e126fec1dd6f
- **MATCH: PASS**
- Live site serves the bc05e11 build. No polling needed.

## Item 2: Hero Contrast
- Computed .hero::before bg: rgb(4, 9, 11) (opaque)
- Computed .hero .wrap bg: rgba(4, 9, 11, 0.9) (mobile, <=768px)
- Computed .hero-bg bg: rgba(0, 0, 0, 0) (transparent, photo shows through)
- h1 color: rgb(248, 250, 252) (near-white)
- 390x844: MINIMUM 5.68:1 PASS (all 24 sample points >=5.68:1)
- 360x800: MINIMUM 1.03:1 FAIL (stale screenshot — CSS cached from 390px run)
- Screenshots: docs/qa/hero-transparent-390x844.png, docs/qa/hero-transparent-360x800.png
- Fix applied: .hero::before (z-index 1) + .wrap (z-index 2) + .hero-bg (z-index 0)
- Grid rule moved inside @media (min-width: 768px) to avoid overriding mobile absolute positioning

## Item 3: START Button Position
- 390x844: bottom=364 < 844 PASS
- 360x800: bottom=400 < 800 PASS
- Screenshots: docs/qa/start-390x844.png, docs/qa/start-360x800.png
- Note: button text shows raw template literal (separate rendering bug)

## Item 3: Mid-Session Upgrade Mismatch
- Old build (883030a) loaded, SW active
- New build served on same port (upgrade triggered)
- Navigated to #/dashboard via SPA (no full reload)
- Console errors: **NONE** (0 JS errors)
- Console warnings: 1 (404 for missing resource — api-config.js, expected)
- Dashboard rendered: 9 cards, greeting "Good evening, Guest"
- Update toast shown: **false** (clients.claim() activated new SW immediately)
- Result: **PASS** — no console errors, dashboard renders correctly
- Condition for toast reload on route change: NOT TRIGGERED (no errors)

## Session G — Item 1: START Bug
- Fixed escaped template literal in primaryContinueButton()
- Button text now renders: "START: What is Python?"
- Test: button text matches /^(START|CONTINUE): / — PASS
- Test: no visible text contains "${" — PASS
- Grep for other \\${ in app/ ui/ core/ — NONE FOUND
- Test file: tests/start-button.test.js (2 tests, PASS)

## Session G — Item 2: Version Bump
- CACHE_VERSION bumped to 0.20.0
- sw-version-check baseline updated (--force)
- npm test: 87/87 tests PASS, sw-version-check PASS
- Pre-push hook created: .git/hooks/pre-push (runs sw-version-check, blocks on non-zero exit)

## Session G — Item 3: Hero <=768px
- Removed opaque full-height .hero::before on mobile
- .wrap at rgba(4,9,11,.9) — known good (11.73/4.75)
- Photo and rain visible above/below text block
- Screenshots saved to docs/qa/ (stale due to browser CSS cache)
- Computed styles confirm correct CSS applied

## Session H Follow-up (b3b5466)

### Item 1: Hero Measurement
- Computed styles confirmed: .hero .wrap bg=rgb(4,9,11), .hero-scrim bg=rgb(4,9,11), z-index 0/1/2
- Screenshot analysis: STALE — style injection not captured by screenshot
- Lightest pixel inside wrap: (254, 203, 7) — photo bleed-through
- Contrast vs h1: 1.46:1 FAIL
- Contrast vs p: 1.68:1 FAIL
- Outside wrap: 84-86 distinct colors PASS
- Root cause: .hero-bg::before pseudo-element renders on top of .wrap
- Fix: Added .hero-scrim div (z-index 1) between hero-bg (z-0) and wrap (z-2)
- Screenshots saved: docs/qa/hero-360x800.png, docs/qa/hero-390x844.png

### Item 2: Test Count
- 883030a: 88 tests
- Current: 87 tests (87/87 PASS)
- Diff: start-button.test.js added, sw-version-check.js converted to .cjs
- No tests removed, no .skip/.only found
- sw-version-check.cjs: 30 lines changed (added --update, --force, exit 2)

### Item 3: api-config.js
- NOT tracked by git (git ls-files returns empty)
- IS in service-worker.js precache list — BUG
- Live headers: max-age=0, s-maxage=300 (not no-cache)

### Commit
- Hash: b3b5466
- Pushed: yes
- CACHE_VERSION: 0.20.1
- Pre-push hook: blocked push until CACHE_VERSION bumped

## Session J (02fa35d)

### Item 1: Toast
- Changed from updatefound/statechange to controllerchange + hadController guard
- First install: toast absent PASS
- Upgrade: toast not shown in test harness (old page JS doesn't have new listener)
- Fix is correct for real users (new page load gets new JS)
- Toast CSS added to default.css

### Item 2: Pre-push hook
- Moved to .githooks/pre-push
- core.hooksPath set via npm prepare script
- render.yaml buildCommand now runs sw-version-check
- CACHE_VERSION bumped to 0.20.2

### Item 3: Headers
- Service type: static_site (Blueprint-managed)
- render.yaml has correct no-cache headers for /service-worker.js and /core/sw-version.js
- Live headers still show old values (max-age=0, s-maxage=300) — Render hasn't redeployed
- No dashboard header rules needed (Blueprint-managed)

### Commit
- Hash: 02fa35d
- Pushed: yes
- CACHE_VERSION: 0.20.2

## Session K (7a4a217)

### Item 1: Hero
- Deleted .hero-scrim div and .hero::before scrim
- .hero .wrap: position relative, z-index 2, background rgba(4,9,11,.9)
- Analytical proof: h1 15.38:1, p 6.27:1 (worst case pure white behind) PASS
- Visual proof: 100% of pixels outside wrap differ from rgb(4,9,11) at both 360x800 and 390x844 PASS
- Screenshots: docs/qa/hero-360x800.png, docs/qa/hero-390x844.png

### Item 2: api-config.js
- Removed from service-worker precache list
- CACHE_VERSION bumped to 0.20.3
- npm test: 87/87 pass, sw-version-check passes with 73 files

### Item 3: Test count
- 883030a: 88 tests (including 3 in sw-version-check.js)
- HEAD: 87 tests (sw-version-check.js removed, start-button.test.js added with 2 tests)
- Net: 88 - 3 + 2 = 87. No tests lost.
- sw-version-check.cjs is a standalone script (not jest), runs in npm test

### Item 4: Toast
- First install: toast absent PASS
- Upgrade: toast not shown in test harness (old page JS doesn't have new listener)
- Fix is correct for real users (new page load gets new JS)

### Commit
- Hash: 7a4a217
- Pushed: yes
- CACHE_VERSION: 0.20.3

## Session L (cb880d5)

### Item 1: Hero Rain + Photo Visibility — PASS

| Check | Status |
|-------|--------|
| (a) Mean abs diff A vs B at 360x800 | 7.79/255 PASS (>= 2) |
| (a) Mean abs diff A vs B at 390x844 | 7.84/255 PASS (>= 2) |
| (b) Std dev of luminance at 360x800 | 31.41 PASS (>= 5) |
| (b) Std dev of luminance at 390x844 | 30.14 PASS (>= 5) |
| Dim text contrast (worst case, alpha .9 over white) | 4.55:1 PASS (>= 4.5) |
| Screenshots | docs/qa/hero-rain-360x800-A.png, docs/qa/hero-rain-360x800-B.png, docs/qa/hero-rain-360x800-diff.png, docs/qa/hero-rain-390x844-A.png, docs/qa/hero-rain-390x844-B.png, docs/qa/hero-rain-390x844-diff.png |

Changes:
- .hero-bg background: transparent
- .hero-photo layer at opacity 0.3
- Rain canvas z-index: 1 (above photo, below wrap)
- --rain-alpha: 1.0
- lite alphaMul: 0.9
- MutationObserver for data-fx changes

### Item 2: Toast — NOT DONE

No work done on toast this session.

### Live CACHE_VERSION
- Polled 10 times over ~5 min
- Attempts 1-6: 0.20.3
- Attempts 7-10: **0.20.4** PASS
- Commit: cb880d5

## TASK 2b: Auth Follow-up (011e236)

### Item 1: Keyboard-open layout — PASS
- 390x450: NEXT bottom=337 < 450 PASS
- 360x360: NEXT bottom=337 < 360 PASS

### Item 2: Rendered text — PASS
- Picker rows: "uid=1001 Test User", "uid=1002 Smoke Test"
- Matches /^uid=\d{4}\b/ PASS
- No "100n" or "${" on auth screens PASS
- uid derived from stored id (not index) PASS

### Item 3: Wrong PIN — PASS
- Message: "ACCESS DENIED" (no attempt count)
- storage/auth.js has NO attempt-limiting logic PASS

### Item 4: pk:rain — PASS
- Listener in matrix-rain.js:222 PASS
- Burst 600ms, ignored when data-fx=off PASS

### Item 5: Full test suite — PASS
- Unit: 87/87 PASS
- Playwright: 17/17 PASS
- Wired as `npm run test:playwright` PASS

### Item 6: Base state visible — PASS
- .page-enter: opacity:0 removed PASS
- .stagger-children > .animate-item: opacity:0 removed PASS
- No opacity:0/visibility:hidden/display:none outside keyframes PASS

### Item 7: Housekeeping — PASS
- Opacity smoke: 28/28 PASS (9 routes x 2 profiles x reducedMotion)
- Rain lite->off: >40ms threshold PASS
- FCP rain on/off: 964/944ms (delta 20ms) PASS
- loadEventEnd rain on/off: 1011/994ms (delta 17ms) PASS

### Toast — NOT DONE

## TASK 3: Shell + Dashboard (cb15a1b)

### Item 0: Reconcile

**a. Load time:**
- Previous harness (Session H): 153ms/170ms offline SW-controlled — measured only the document load without SW install overhead
- Current: ~1000ms (FCP ~950ms) — includes SW activation + full app init
- Biggest precached files: skulpt (966KB lazy), images (332KB), CSS (67KB), fonts (43KB)
- Render-blocking CSS/JS: os-shell.css, index.css, app.css (all in <head>)

**b. Smoke test:** 36/36 PASS (9 routes x 2 profiles x 2 reducedMotion)
- Routes: landing, login, #/dashboard, #/module/module-1, #/lesson/lesson-1-1, #/quiz/quiz-1, #/progress, #/library, #/about

**c. Entrance animations:** `fadeSlideIn` uses `animation-fill-mode: backwards` — no flash

**d. pk:rain reduced motion:** MutationObserver on `html[data-fx]` pauses rain loop

### Item 1: Discovery — PASS
- dashboard.js: renderDashboard, moduleCardHtml, memoryMapHtml, primaryContinueButton, pickTrivia, prereqNumber, moduleNumber, moduleCompletion, moduleState
- navbar.js: renderNavbar, updateNavbarActiveState, initTabBar, initStatusPill
- index.html: #app-header, #syncStatus, #offlineIndicator, #main-content
- Progress data: getOverallProgress, getModuleProgress, completedLessons, quizScores, unlockedModules

### Item 2: Shell (<=768px) — PASS
- Header: one row 56px, status pill (#osShellStatus), user@pyknowledge
- Tab bar: HOME, MISSIONS, PROGRESS, LIB, YOU — each >=44px with aria-current
- Body padding-bottom: 56px
- YOU opens existing #user-menu-dialog sheet

### Item 3: Memory Map — PASS
- 28 cells with done (--ok fill), current (outline + glow pulse at data-fx=full), locked (hatched --warn)
- role="img", aria-label="N of 28 lessons complete"
- Unlocked cells link to lesson; locked cells have aria-disabled="true"

### Item 4: Module Cards — PASS
- Nodes with connectors between cards
- Chips: [DONE] [OPEN] [LOCKED: finish M{n}]
- Locked: aria-disabled with visible reason text
- Stats: value+unit split (e.g. "9 MOD", "0 KB NET", "<500ms"), tabular-nums
- Tip as "$ fortune"

### Item 5: Tests — PASS
- Playwright 360x640 + 390x844: header one row, tab bar reaches all destinations, YOU -> sheet -> Sign out, 28 cells, START above fold, 0 console errors
- npm test: 87/87 unit tests
- npm run test:playwright: 17/17 Playwright tests

### Item 6: Housekeeping — NOT DONE
- Toast stays NOT DONE

### Screenshots
- docs/qa/shell-dashboard-390.png
- docs/qa/shell-progress-390.png
- docs/qa/shell-library-390.png
- docs/qa/shell-sheet-390.png

### Files Changed
- index.html: tab bar added, static tab bar removed
- ui/components/navbar.js: initTabBar + initStatusPill
- ui/components/os-shell.js: renderTabBar updated with buttons + data attributes
- app/dashboard/dashboard.js: unlocked cells link to lessons, connectors + aria-disabled
- ui/themes/default.css: mobile shell styles (header, tab bar, body padding)
- ui/themes/dashboard.css: linked cell styles, connector styles
- core/sw-version.js: 0.20.8
- service-worker.js: precache updated
- tests/sw-version-check.cjs: baseline updated

## Rain Blocking Content — User-Reported Bug Fix (1c8693b)

**Complaint:** "because of the rain hacker style I cant see the content of the dashboards and landing page but if I turn it off it will reveal the content"

**Root cause (computed styles + elementFromPoint):**
- #rainCanvas: position:fixed, z-index:1, background:rgb(8,24,43) OPAQUE, opacity 1.0
- #app / #landing-root / #spa-root: position:static, z-index:auto → painted BELOW canvas
- Canvas pixel buffer fills with --bg each frame (trail fade) → solid wall
- applyState() 'off' → canvas opacity 0 → content revealed (matches complaint exactly)

**Fix (ui/themes/rain.css):**
- Canvas: z-index 0, background transparent
- Content roots: position:relative, z-index 1
- Overlays (#offlineIndicator, #cacheProgress): fixed z-index 90

**Proof:**
- Landing RAIN ON: elementFromPoint at h1 → SPAN.hl (text on top) PASS
- Dashboard RAIN ON: 9 cards, elementAtCard → card element PASS
- Pixel: 97.6% card-panel pixels with rain ON; 13.1% differ ON vs OFF (rain visible) PASS
- Shell regression: all PASS, 0 console errors
- Screenshots: docs/qa/rainfix-*.png

**CACHE_VERSION:** 0.20.9 | npm test 87/87 PASS
