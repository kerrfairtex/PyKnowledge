# PyKnowledge — Offline Build Orchestration & UI Design Spec

Purpose: a working order for building PyKnowledge's **client-only, offline-first** mode from source, structured as sequential build phases with a "prompt" for each phase (usable with an AI pair-programmer or as a personal task checklist), plus a UI design spec matching the confirmed architecture and hardware constraints.

Scope note: this covers Option A (offline client PWA) only. `server/` (Express+Prisma+Postgres) is out of scope here — it's an optional v0.4.0+ add-on, not required for the offline deliverable.

---

## 0. Build Order Rationale

Dependency chain, bottom-up — each phase only depends on what's already built:

```
utils/  →  core/  →  storage/  →  content/  →  app/  →  ui/  →  service worker  →  packaging
```

You cannot build `app/` (dashboard, lessons, quizzes) before `core/storage.js` exists, because every app module reads/writes progress through it. Content schema must exist before `checkPrerequisite()` can be tested against real data. UI is built last because it's the presentation layer over working logic — building it first means styling functions that don't exist yet.

---

## Phase 1 — Utils (foundation, no dependencies)

**Build:** `utils/sanitize.js`, `utils/schema.js`, `utils/parser.js`, `utils/validator.js`, `utils/crypto.js`

**Prompt to use:**
> Build `utils/sanitize.js` with an `escapeHtml(str)` function that neutralizes `<`, `>`, `&`, `"`, `'` for safe innerHTML use. Build `utils/schema.js` with `validateLessonsSchema(json)` and `validateQuizzesSchema(json)` that check required fields per the PyKnowledge content schema (module id/title/lessons array; quiz id/lessonId/questions array). Build `utils/crypto.js` with `hashPin(pin)` and `verifyPin(pin, hash, salt)` using Web Crypto SubtleCrypto PBKDF2, plus `generateUserId()` and `isCryptoAvailable()`. No external dependencies — Vanilla JS ES6+ only.

**Why first:** everything else imports from here. Zero circular dependencies possible if this layer has no imports of its own.

---

## Phase 2 — Core Kernel

**Build:** `core/storage.js`, `core/router.js`, `core/loader.js`, `core/errors.js`, `core/version.js`, `core/engine.js`

**Prompt to use:**
> Build `core/storage.js` as a LocalStorage wrapper: `getProgress()` / `saveProgress(progress)` operating on key `pyknowledge_progress_${userId}` (fallback to plain `pyknowledge_progress` if no active user). Default progress shape: `{ completedLessons: [], quizScores: {}, unlockedModules: [], achievements: [] }`. Build `core/router.js` as hash-based SPA routing (`#/dashboard`, `#/lesson/:id`, `#/quiz/:id`) with a 404 fallback view. Build `core/loader.js` with `loadContent(path)` that fetches JSON and validates it via `utils/schema.js` before returning — throw on schema failure, never render invalid content. Build `core/version.js` exporting a single `APP_VERSION` constant used by both the UI footer and the service worker cache name. Build `core/engine.js` as the bootstrap: initializes router, loads content, mounts the initial view.

**Why here:** storage.js must exist before any module that reads/writes progress (Phase 3 depends on it directly).

---

## Phase 3 — Storage Domain Layer

**Build:** `storage/progress.js`, `storage/achievements.js` (auth.js already exists per your upload)

**Prompt to use:**
> Build `storage/progress.js` with `checkPrerequisite(moduleId, lessonsData)`, `unlockNextModule(completedLessonId, lessonsData)`, `getModuleProgress(moduleId, lessonsData)`, `getOverallProgress(lessonsData)` — all reading/writing through `core/storage.js`'s `getProgress()`/`saveProgress()`. Build `storage/achievements.js` with a static `ACHIEVEMENTS` array (first-lesson, first-quiz, module-complete, perfect-score) and `checkAchievements(lessonsData)` that diff-checks against `progress.achievements`.

**Status:** you've already confirmed this code exists and matches this spec exactly (from your earlier upload) — no rebuild needed, just verify it's wired to `core/storage.js` correctly.

---

## Phase 4 — Content

**Build:** `content/lessons.json`, `content/quizzes.json`, `content/assets/videos/`

**Prompt to use:**
> Create `content/lessons.json` following the CHED Python curriculum: modules with `id`, `title`, `description`, `prerequisite` (null or prior module id), and `lessons[]` each with `id`, `title`, `duration`, `video` path, `content.sections[]` (heading/body/optional code). Create matching `content/quizzes.json` — every quiz `id` must equal a lesson `id`. Use `multiple-choice` (index-based `correctAnswer`), `true-false` (boolean), and `fill-blank` (string or array, case-insensitive) question types. Run `npm run validate:content` after every edit.

**Hardware constraint to respect:** total video payload capped at 250MB (10× 720p H.264 MP4), core codebase under 5MB — don't reference uncompressed or 1080p+ assets.

---

## Phase 5 — App Modules

**Build:** `app/dashboard/`, `app/lessons/`, `app/quizzes/`, `app/progress/`

**Prompt to use:**
> Build `app/dashboard/` to render module cards using `getOverallProgress()` and `checkPrerequisite()` — locked modules show a lock icon and the `reason` string, not just hidden. Build `app/lessons/` to render `content.sections` (heading/body/code with `escapeHtml()` applied to all user-facing text) plus a `<video>` element sourced from the lesson's `video` path. Build `app/quizzes/` with `calculateScore()` (percentage, 70% pass threshold) supporting all three question types from the schema, calling `saveProgress()` and `checkAchievements()` on submit. Build `app/progress/` as a read-only detailed view combining `getModuleProgress()` per module and `getAchievements()`.

**Why after content:** these modules render real schema-shaped data — building the UI against a hypothetical shape risks mismatched field names.

---

## Phase 6 — UI Layer (see design spec below)

**Build:** `ui/components/`, `ui/themes/`, `ui/assets/`

**Prompt to use:**
> Build `ui/components/` as small, framework-free DOM-builder functions (no JSX, no React — Vanilla JS `document.createElement` or template strings + `escapeHtml()`). Build `ui/themes/` as CSS custom properties (`--color-primary`, `--color-bg`, `--spacing-unit`, etc.) so profile avatar colors and dark/light mode can be swapped without touching component code. Keep total UI asset weight minimal — no icon fonts, use inline SVG.

---

## Phase 7 — Service Worker + Offline Strategy

**Build:** `core/service-worker.js`

**Prompt to use:**
> Build a cache-first service worker: on `install`, cache a `STATIC_ASSETS` array covering all HTML/CSS/JS/JSON/video paths, versioned by `core/version.js`'s `APP_VERSION` as the cache name. On `fetch`, serve from cache first, fall back to network, and cache the network response for next time. On `activate`, purge caches whose name doesn't match the current version. Show an update-available banner when a new SW version is waiting, and only reload on explicit user action — never force-reload mid-session.

**Test:** load app, go offline in DevTools, confirm every route and asset still resolves.

---

## Phase 8 — Packaging & Validation

**Prompt to use:**
> Run `npm run validate:content`, `npm test`, then `npm run package` to produce the USB-portable zip. Confirm final size: core codebase < 5MB, total package with videos < 250MB. Verify `npm start` serves the app with no build step (raw ES modules).

---

## Termux Build Loop (tying it to your actual workflow)

```bash
cd ~/PyKnowledge
git pull origin main --rebase        # sync first, always
# work through one phase above
npm run validate:content              # if content changed
npm test                              # if logic changed
git add .
git commit -m "Phase N: <what you built>"
git push origin main
```

---

## UI Design Spec

Grounded in the confirmed constraints: 1024×768 minimum display, 2GB RAM legacy hardware, no external UI frameworks, <5MB codebase, offline-first.

### Design Principles

1. **No framework weight.** No Bootstrap/Tailwind CDN, no icon fonts — inline SVG only, CSS Grid/Flexbox for layout. This isn't just a style choice, it's the 5MB budget forcing it.
2. **Legacy-hardware-safe rendering.** Avoid heavy CSS (backdrop-filter, complex box-shadows stacked, large blur radii) that taxes integrated GPUs on dual-core machines. Prefer flat design with restrained shadow use.
3. **Design for 1024×768 first**, scale up — not the reverse. Test at minimum res before anything else.
4. **Profile-avatar color system already exists in code** (`pickAvatar()` picks from a 6-color palette keyed by name's first character) — theme should incorporate those same 6 colors as accent options, not introduce a clashing palette.

### Color System (as CSS custom properties)

```css
:root {
  --color-primary: #0f3460;      /* from existing avatar palette */
  --color-accent: #4ecca3;
  --color-warning: #f0a500;
  --color-danger: #e94560;
  --color-bg: #f7f7fa;
  --color-surface: #ffffff;
  --color-text: #1a1a2e;
  --color-text-muted: #6b6b80;
  --color-locked: #b0b0c0;
  --radius: 8px;
  --spacing-unit: 8px;
}
```

### Screen-by-screen

**Profile Select (first screen, no login page in the traditional sense):**
- Grid of profile cards, one per saved profile — avatar circle (color from `pickAvatar()`), display name, "Continue" on tap
- "+ New Profile" card always last in the grid
- New profile form: name field, 4+ digit numeric PIN field, PIN confirmation
- Large tap targets (≥44px) — built for touchscreen labs and older trackpads alike

**Dashboard:**
- Module cards in a responsive grid (CSS Grid, `auto-fit, minmax(280px, 1fr)`)
- Each card: title, progress bar (from `getModuleProgress()`), lock overlay + `reason` text if `checkPrerequisite()` fails
- Overall progress ring or bar at top from `getOverallProgress()`
- Offline indicator badge (small, persistent, non-intrusive) — since network state affects nothing functionally but users should still see it's working as intended

**Lesson View:**
- Video player (native `<video controls>` — no custom player chrome, keeps weight down and avoids GPU-heavy custom controls)
- Section content below, rendered from `content.sections[]`, code blocks in monospace with a subtle background tint
- Sticky "Mark Complete" / "Take Quiz" action bar at bottom

**Quiz View:**
- One question per screen (not a long scroll) — reduces cognitive load and matches small-screen/low-res constraint
- Progress dots at top (`● ● ○ ○ ○`)
- Immediate local validation, no server round-trip
- Results screen: score, pass/fail against 70% threshold, "Retry" or "Continue" based on result

**Progress View:**
- Per-module breakdown (bar per module)
- Achievement badges — locked achievements shown greyed/outlined, not hidden (this drives motivation more than hiding them)

### Component Inventory (`ui/components/`)

| Component | Used by |
|---|---|
| `ProfileCard.js` | Profile select |
| `ModuleCard.js` | Dashboard |
| `ProgressBar.js` | Dashboard, Progress view |
| `LockOverlay.js` | Dashboard (locked modules) |
| `VideoPlayer.js` | Lesson view (thin wrapper, native controls) |
| `QuizQuestion.js` | Quiz view (renders per type: MC/TF/fill-blank) |
| `AchievementBadge.js` | Progress view |
| `OfflineIndicator.js` | Global header |
| `Toast.js` | Save confirmations, errors |

Each component: a plain function taking data + returning a DOM node or HTML string (post-`escapeHtml()`), no build step, no JSX — consistent with the "runs as-is from source ES modules" requirement in the README.

---

## Summary Table

| Phase | Depends on | Output |
|---|---|---|
| 1. Utils | — | sanitize, schema, parser, validator, crypto |
| 2. Core | Utils | storage, router, loader, engine |
| 3. Storage domain | Core | progress.js, achievements.js (already built) |
| 4. Content | Utils (schema) | lessons.json, quizzes.json, videos |
| 5. App modules | Core, Storage, Content | dashboard, lessons, quizzes, progress |
| 6. UI | App modules | components, themes, assets |
| 7. Service Worker | everything static | offline caching |
| 8. Packaging | all | USB zip, size validation |
