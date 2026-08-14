# PyKnowledge — Conceptual Build Order Note

Purpose: a current, repo-aligned build order for PyKnowledge's client-first offline experience. This is a sequencing note for implementation, extension, or refactoring work — not a claim that every phase must be rebuilt from scratch.

Scope note: the primary path here is the browser app in `/app`, `/core`, `/storage`, `/ui`, `/utils`, and `/content`. The optional `/server` workspace is additive and should not block delivery of the offline client.

## 0. Build Order Rationale

Build bottom-up so each layer depends only on stable lower-level behavior:

```text
utils/ → storage/auth + core/storage → core/loader + core/router + core/engine → storage/ domain logic → content/ → app/ → ui/ → service worker → validation + packaging
```

Key rule: do not build screens first. In this repository, rendering depends on stable content loading, auth/session state, progress persistence, and sanitization.

---

## 1. Utilities and Content Contracts

Build or stabilize:

- `utils/sanitize.js`
- `utils/schema.js`
- `utils/parser.js`
- `utils/validator.js`
- `utils/crypto.js`

Why first:

- `escapeHtml()` is a repository-wide rendering rule for user-facing text.
- schema and answer validation define the shape expected by content loaders and quiz flows.
- local PIN auth depends on crypto helpers before profile creation can work.

Definition of done:

- dynamic text is sanitized before HTML rendering
- lesson and quiz JSON can be validated consistently
- PIN hashing and verification work in supported browsers

---

## 2. Persistence and Session Foundation

Build or stabilize:

- `storage/auth.js`
- `core/storage.js`
- `core/version.js`
- `core/api.js`

Why here:

- progress is keyed per user through the auth layer
- nearly every app flow reads from `core/storage.js`
- version state must exist before service-worker cache versioning and version checks
- API support is optional, but the app needs a clean offline fallback contract early

Definition of done:

- profiles, sessions, and per-user progress keys behave predictably
- guest fallback still works
- version constants are established and API configuration fails safely when absent

---

## 3. Core App Kernel

Build or stabilize:

- `core/loader.js`
- `core/router.js`
- `core/errors.js`
- `core/engine.js`

Why here:

- routes should only exist after content loading and persistence rules are stable
- the engine is the composition point for auth gating, content loading, and page mounting
- error views should be defined before app modules rely on them

Definition of done:

- content loads from static JSON, with optional API use when configured
- invalid content fails closed instead of rendering partially
- core routes mount the correct flows and unknown routes fail gracefully

---

## 4. Domain Logic Over Storage

Build or stabilize:

- `storage/progress.js`
- `storage/achievements.js`

Why here:

- unlocking, completion, percentages, and achievements should be solved once in storage/domain logic, not reimplemented in views
- dashboard, quizzes, and progress screens all depend on these rules

Definition of done:

- prerequisite checks return both access state and user-facing reason text
- module and overall progress calculations are consistent
- achievement checks are derived from saved progress, not duplicated per screen

---

## 5. Content and Assets

Build or stabilize:

- `content/lessons.json`
- `content/quizzes.json`
- `content/assets/videos/`

Why after contracts:

- content shape must match the schema and app expectations
- prerequisite chains, lesson IDs, and quiz IDs must be coherent before UI work is trusted

Definition of done:

- lessons, quizzes, and prerequisites validate cleanly
- every quiz maps correctly to lesson flow expectations
- media choices remain appropriate for offline delivery and legacy hardware
- core code remains under the 5MB repository budget for non-video assets
- bundled video payload stays within the roughly 200–250MB offline package target

---

## 6. App Flows

Build or stabilize:

- `app/home/`
- `app/auth/`
- `app/dashboard/`
- `app/lessons/`
- `app/quizzes/`
- `app/progress/`

Why here:

- these modules turn content and domain logic into user journeys
- auth and home flows belong here because they gate the rest of the application experience

Definition of done:

- home and auth flows enter the app cleanly for both profiles and guest use
- dashboard reflects lock state and progress accurately
- lesson flow respects sequencing and renders sanitized content
- quiz flow scores locally and writes progress/achievements correctly
- progress view reflects persisted state without recomputing business rules in the UI layer

---

## 7. UI Components and Themes

Build or stabilize:

- `ui/components/navbar.js`
- `ui/components/progress-bar.js`
- `ui/components/video-player.js`
- `ui/components/toast.js`
- `ui/components/offline-indicator.js`
- `ui/components/loading.js`
- `ui/components/update-notifier.js`
- `ui/components/animations.js`
- `ui/themes/default.css`
- `ui/themes/landing.css`
- `ui/themes/animations.css`

Why after app flows:

- UI should wrap working behaviors, not invent them
- component extraction is easier once repeated patterns are visible in real screens

Definition of done:

- components remain framework-free and light enough for the offline PWA target
- user-facing dynamic text remains sanitized before insertion into HTML
- theme choices respect the low-spec hardware target and existing avatar color system

---

## 8. Offline Runtime

Build or stabilize:

- `core/service-worker.js`
- `manifest.json`

Why near the end:

- the service worker must know the final static asset set
- offline caching is only trustworthy once routes, content, and UI assets are known

Definition of done:

- required static assets are cached for offline use
- new static assets are added to the service-worker cache list
- update behavior is explicit and user-safe

Versioning note:

- keep `core/version.js` and `core/service-worker.js` in sync
- verify version alignment with `npm run check:version`

---

## 9. Validation and Packaging

Run in this order as appropriate:

```bash
npm run lint
npm test
npm run validate:content
npm run check:version
npm run package
```

Optional follow-up checks:

```bash
npm run test:perf
```

Use this phase to confirm:

- content validates
- client logic tests pass
- version constants are synchronized
- packaging still produces a portable offline artifact
- size targets still fit the offline distribution constraints

---

## Workflow Note

Use the repository contribution flow, not direct pushes to `main`:

```bash
git checkout -b <feature/your-description>
# make focused changes
npm run lint
npm test
npm run validate:content
npm run check:version
git add <changed-paths>
git commit -m "Describe the change"
# push branch and open a pull request
```

This note is conceptual build guidance. For day-to-day contribution rules, treat `CONTRIBUTING.md` as the source of truth.
