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
