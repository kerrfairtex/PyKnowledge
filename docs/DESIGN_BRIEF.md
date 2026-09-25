# PyKnowledge — Full Audit & Design Plan
# docs/DESIGN_BRIEF.md

---

## 0. EXECUTIVE SUMMARY

PyKnowledge is a PWA for offline Python education targeting TRAC/BARMM/CHED students
in Tawi-Tawi. Single HTML file (index.html), plain HTML/CSS/ES modules, Skulpt for
Python execution, Jest for unit tests, Playwright for E2E, Render for deployment.
The codebase is mature (v0.20.9) with strong test coverage (87 unit + 17 Playwright)
but has accumulated structural drift and several deployment-breaking issues.

---

## 1. AUDIT FINDINGS

### 1.1 Structure & Architecture

| Finding | Severity | Details |
|---------|----------|---------|
| Two HTML shells | LOW | index.html (new unified landing+SPA) replaced app-shell.html but app-shell.html was NOT deleted. It references wrong SW path (`/core/service-worker.js` vs `/service-worker.js`). Dead file, confusing for new devs. |
| Token duplication | HIGH | index.css redefines `:root` token block with DIFFERENT values than `ui/themes/tokens.css`. Both loaded by index.html (tokens.css first, then index.css). index.css overrides the design system — `--bg` flips from `#04090b` (deep teal/black) to `#08182B` (blue-black). This is a CSS cascade conflict. |
| 12 `<link>` stylesheets in index.html head | MEDIUM | tokens.css + os-shell.css + os-auth.css + rain.css + index.css + default.css + animations.css + dashboard.css + library.css + about.css + 2 more. Not all are scoped to their screens; global cascade means later sheets override earlier ones unpredictably. |
| api-config.js not in SW precache | MEDIUM | `api-config.js` is served inline-loaded and referenced in index.html footer and app-shell.html, but NOT in STATIC_ASSETS. On offline repeat-visit, the file won't be cached. The git log explicitly notes "api-config.js is in precache but NOT tracked by git — needs removal" but it WAS added to SW later. Verify current state. |

### 1.2 Service Worker & Caching

| Finding | Severity | Details |
|---------|----------|---------|
| SW registration path mismatch in app-shell.html | HIGH | app-shell.html line 21: `navigator.serviceWorker.register('/core/service-worker.js')` — file does NOT exist at `/core/`. Actual SW is at `/service-worker.js` (root). index.html correctly uses `/service-worker.js`. app-shell.html is dead but if anyone uses it, SW fails. |
| Missing SW precache entries | MEDIUM | `enhanced-navigation.js`, `keyboard-shortcuts.js`, `scroll-animations.js` are NOT in STATIC_ASSETS. These are loaded via `<script>` or dynamic import. On offline repeat visits, these fail to load → broken enhanced navigation, no keyboard shortcuts, no scroll animations. |
| Two SW version check files | LOW | `sw-version-check.cjs` (used by npm scripts) and `sw-version-check.js` (ESM) both exist. The .cjs has lint errors (`__dirname`, `process`, `console` not defined — ESLint CJS globals not configured). Running `npx eslint .` on this file produces 15 errors. |
| 73 precached files, version 0.20.9 | OK | sw-version-check passes. CACHE_VERSION bumped consistently. |

### 1.3 Lint & Tooling

| Finding | Severity | Details |
|---------|----------|---------|
| ESLint errors in test/build files | MEDIUM | `tests/sw-version-check.cjs`: 15 errors (CJS globals not configured for ESLint). `tests/auth-playwright.mjs`: 9 errors (browser globals not configured). `ui/components/matrix-rain.js:189`: empty block error. These block `npm run lint` from passing clean. |
| ESLint warnings in source | LOW | 10 warnings: unused vars in dashboard.js, router.js, animations.js, code-editor.js, enhanced-navigation.js, keyboard-shortcuts.js. Cleanable but low priority. |
| No TypeScript | LOW | All JS, no types. Fine for this project's constraints. |
| ESLint config doesn't cover .cjs files | MEDIUM | The `files: ['**/*.js']` config doesn't match `*.cjs`. CJS files get no globals. Need to add `*.cjs` to the config or exclude test scripts. |

### 1.4 Test Suite

| Finding | Severity | Details |
|---------|----------|---------|
| 87 unit tests pass | OK | All pass with correct runner: `node --experimental-vm-modules node_modules/jest/bin/jest.js` |
| 17 Playwright tests pass | OK | All pass per recent commits |
| sw-version-check passes | OK | 73 files, version 0.20.9 |
| No integration tests exist | LOW | `server/tests` directory exists but `test:integration` pattern finds no integration tests |
| Playwright test file has lint errors | LOW | auth-playwright.mjs has browser global errors but tests still run |

### 1.5 Accessibility

| Finding | Severity | Details |
|---------|----------|---------|
| Good a11y foundation | OK | `<html lang="en">`, `<main id="main-content" role="main" tabindex="-1">`, `aria-label`s on buttons, `role="status"` with `aria-live="polite"`, `prefers-reduced-motion` media query, `loading="lazy"` on images. |
| No skip-to-content on index.html | MEDIUM | index.html has no "skip to main content" link. app-shell.html has one (`<a href="#main-content" class="skip-link">`). index.html users must tab through the entire topbar/nav to reach content. |
| Color scheme contrast | OK | Dark theme, `--text` at `#cfe8dc` on `--bg` at `#04090b` = ~14.5:1 contrast. Tokens report "14.51:1" in git logs. |
| focus-visible outline | OK | `outline: 3px solid var(----info)` on `:focus-visible`, 2px offset. |
| No `lang` attribute switching | LOW | `lang="en"` only, no i18n for Filipino/Bisaya speakers (Tawi-Tawi context). |

### 1.6 Frontend Design (Current State)

| Finding | Severity | Details |
|---------|----------|---------|
| Design language is "OS terminal" | OK (by design) | JetBrains Mono, sharp corners (0-4px radius), 1px lines, green/red signals, dark theme. Consistent with DESIGN_BRIEF spec. |
| Token conflict between index.css and tokens.css | HIGH (see 1.1) | Two competing token definitions. The index.css `:root` block (blue-black palette) overrides the tokens.css palette (deep teal/black). Landing page currently renders with index.css values because it loads AFTER tokens.css. |
| 4 themes supported | OK | green (default), amber, ice, auto via `[data-theme]`. Persisted via `localStorage.getItem('pk-theme')`. |
| FX tier system works | OK | off/lite/full based on device capabilities + user preference. MutationObserver on `data-fx`. |
| Matrix rain is 0.20.9 | OK | Self-protecting, route-aware, theme-collected. |
| Nova chatbox is separate file | LOW | `nova-chatbox.html` is a standalone file (not integrated into SPA routing). Linked from hero "Try the AI Chatbox Demo". |

### 1.7 Backend (server/)

| Finding | Severity | Details |
|---------|----------|---------|
| Express + Prisma + PostgreSQL | OK | Standard stack. API routes: `/api/health`, `/api/content`, `/api/auth`. |
| CORS_ORIGIN empty by default | MEDIUM | In render.yaml + render.json, `CORS_ORIGIN` is `""` — needs to be set to the client URL after deploy. Documented but error-prone. |
| No rate limiting | LOW | Express app has no rate limiting middleware on auth routes. |
| JWT_SECRET auto-generated | OK | Render generates it. |

### 1.8 Content

| Finding | Severity | Details |
|---------|----------|---------|
| 3 lessons in content/lessons.json | LOW | DESIGN_BRIEF mentions "9 modules, 28 lessons" but content JSON only has 3. May be starter/sampled data. Curriculum/ directory has more markdown curricula. |
| Curriculum markdown exists | OK | `Curriculum/` has `ROADMAP.md`, `LESSON_GUIDELINES.md`, and per-module `.md` files. |

---

## 2. PLANNED UPGRADES — Frontend Design

### Phase 1: Structural Cleanup (High Priority — Fixes)

**T1: Resolve token conflict**
- Consolidate all CSS custom properties into `ui/themes/tokens.css` only.
- Remove the competing `:root` block from `index.css`.
- Update `index.css` to reference tokens from `tokens.css` instead of redefining them.
- Ensure the color palette is consistent: deep teal/black (`--bg #04090b`) as the base per the design spec.
- **Verification**: grep for `:root` in index.css, confirm no duplicate token definitions.

**T2: Delete dead app-shell.html**
- app-shell.html is superseded by index.html (which embeds the SPA shell via `#spa-root`).
- Remove app-shell.html. It references a non-existent SW path (`/core/service-worker.js`).
- **Verification**: `ls app-shell.html` returns not found. Render deploy still works.

**T3: Fix SW precache gaps**
- Add `enhanced-navigation.js`, `keyboard-shortcuts.js`, `scroll-animations.js` to STATIC_ASSETS in service-worker.js.
- Add `api-config.js` if not present (verify current state).
- Bump CACHE_VERSION from 0.20.9 → 0.21.0.
- **Verification**: `node tests/sw-version-check.cjs` passes, all 76 files present.

### Phase 2: Accessibility Improvements

**T4: Add skip-to-content link to index.html**
- Add `<a href="#main-content" class="skip-link">Skip to main content</a>` at top of body.
- Style it in index.css (visible on focus, hidden otherwise).
- **Verification**: Tab to top of page → skip link appears, focuses #main-content.

**T5: Add lang attribute for Filipino context**
- Add `lang="fil"` option or `lang="tl"` (Tagalog) detection.
- At minimum, document i18n readiness in DESIGN_BRIEF.
- **Verification**: N/A (documentation)

### Phase 3: Polish & Consistency

**T6: Consolidate CSS loading order**
- Document which CSS file styles which screen.
- Ensure `tokens.css` loads first (it does), then theme files, then `index.css` last (it does — good).
- Remove `index.html.bak` (dead backup file).
- **Verification**: grep stylesheet order in index.html.

**T7: Fix ESLint CJS config**
- Add `*.cjs` file pattern to ESLint config with `globals.node` environment.
- Fix `matrix-rain.js:189` empty block.
- Clean up unused var warnings (10 items).
- **Verification**: `npm run lint` exits 0.

---

## 3. ISSUE REGISTER (All Findings)

| ID | Issue | Status | Severity | Owner | Plan |
|----|-------|--------|----------|-------|------|
| ISS-01 | Token conflict: index.css vs tokens.css | OPEN | HIGH | — | T1 — consolidate into tokens.css |
| ISS-02 | app-shell.html SW path wrong + dead file | OPEN | HIGH | — | T2 — delete file |
| ISS-03 | enhanced-navigation.js not in SW precache | OPEN | MEDIUM | — | T3 — add to STATIC_ASSETS |
| ISS-04 | keyboard-shortcuts.js not in SW precache | OPEN | MEDIUM | — | T3 — add to STATIC_ASSETS |
| ISS-05 | scroll-animations.js not in SW precache | OPEN | MEDIUM | — | T3 — add to STATIC_ASSETS |
| ISS-06 | ESLint errors on .cjs test files | OPEN | MEDIUM | — | T7 — fix config |
| ISS-07 | matrix-rain.js empty block lint error | OPEN | LOW | — | T7 — fix in cleanup |
| ISS-08 | index.html missing skip-to-content link | OPEN | MEDIUM | — | T4 — add link |
| ISS-09 | index.html.bak dead backup file | OPEN | LOW | — | T6 — delete |
| ISS-10 | api-config.js may not be in SW precache | OPEN | MEDIUM | — | T3 — verify + add if needed |
| ERR-01 | 404 on /core/service-worker.js (app-shell.html) | OPEN | HIGH | — | T2 — fixed by deletion |
| ERR-02 | CORS_ORIGIN empty in render.yaml | OPEN | MEDIUM | — | Document post-deploy setup |
| ERR-03 | Only 3 lessons in content JSON vs 28 expected | OPEN | LOW | — | Content authoring gap, not code bug |

---

## 4. ERROR DIARY (Runtime/Operational Errors Observed)

| ID | Error | Source | When | Action |
|----|-------|--------|------|--------|
| ERR-01 | SW registration fails: `/core/service-worker.js` 404 | app-shell.html | Any load of app-shell.html | Delete app-shell.html (T2) |
| ERR-02 | eslint exits with 25 errors | local `npx eslint .` | Every lint run | Fix CJS globals config (T7) |
| ERR-03 | Hermes plugin hook: `pre_agent_board` import fails | .hermes/plugins/omh/ | Session start | Not PyKnowledge — Hermes infra issue |
| ERR-04 | Nous API 429: "temporarily at capacity upstream" | Hermes model provider | 2026-09-25 | Not PyKnowledge — external provider |

---

## 5. EXECUTION PLAN

### Phase A: Critical Fixes (T1, T2, T3) — 1 session
```
Step 1: Edit index.css — remove `:root` token block, import from tokens.css
Step 2: Delete app-shell.html
Step 3: Edit service-worker.js — add 3 missing JS files to STATIC_ASSETS
Step 4: Bump CACHE_VERSION 0.20.9 → 0.21.0 (core/sw-version.js)
Step 5: Run sw-version-check.cjs --update
Step 6: Verify: npm test, npm run lint (expect lint still failing on .cjs)
```

### Phase B: Quality & A11y (T4, T6, T7) — 1 session
```
Step 1: Add skip-link to index.html + style in index.css
Step 2: Delete index.html.bak
Step 3: Fix ESLint config for .cjs files
Step 4: Fix matrix-rain.js empty block
Step 5: Clean unused var warnings
Step 6: Verify: npm run lint exits 0, npm test passes
```

### Phase C: Design Polish & Future (T5) — deferred
```
i18n readiness documentation
Optional: Theme toggle UI in settings
```

---

## 6. VERIFICATION COMMANDS

```bash
# Lint (should exit 0 after T7)
npm run lint

# Unit tests (should be 87/87)
node --experimental-vm-modules node_modules/jest/bin/jest.js

# SW version check (should pass)
node tests/sw-version-check.cjs

# Full test suite
npm test

# Token conflict check (should return 0 after T1)
grep -c "^  --" ui/themes/tokens.css  # baseline count
grep -c "^  --" index.css             # should be 0 after removing :root block

# Skip-link check (should return 1 after T4)
grep -c "skip-link" index.html

# Dead file check (should return 1/not found after T2+T6)
ls app-shell.html 2>&1 | grep -c "No such"
ls index.html.bak 2>&1 | grep -c "No such"
```

---

## 7. DESIGN PHILOSOPHY (Per User Brief)

Maximalist terminal-O/S aesthetic, but grounded in real data:
- Every readout shows real values (cache count, online state, progress)
- No fake decoration, no fake code execution
- Sharp corners (0-4px), 1px lines, JetBrains Mono
- Dark theme with green signal (`#3dff9a`) as primary
- 4 themes: green/amber/ice + user override
- FX tiers: off/lite/full based on device capability
- Fully offline after install — no external requests

---

*Start every task with: "Read docs/DESIGN_BRIEF.md, then do TASK n only."*
