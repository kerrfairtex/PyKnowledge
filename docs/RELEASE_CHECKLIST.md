# PyKnowledge Release Checklist — v0.22.0

Manual verification steps to confirm students keep their progress and
receive the fix when they reconnect after a service-worker update.

## Versions (verify before testing)

- Currently deployed (origin/main @ 0194a57): version unknown from local repo —
  read live `core/sw-version.js` to confirm its `SW_VERSION`. Live build is
  at `0.21.1`; this release is `0.22.0` (higher than live).
- New version to deploy (local fix/wire-footer @ HEAD):
  - App version: `0.22.0` (`core/version.js`)
  - Service worker cache version: `0.22.0` → cache name `pyknowledge-v0.22.0`
    (`core/sw-version.js`)

Progress lives in IndexedDB (preferred) with a localStorage mirror. Both
survive a service-worker update because the activate handler only deletes
old caches, never IndexedDB or localStorage.

A backup/restore feature for progress is NOT built yet. Clearing site data
will delete progress permanently.

---

## Test 1 — Install the deployed version as a PWA and complete lesson 1-1 and its quiz

Do this on each device (Android phone + PC).

| # | Step | PASS / FAIL |
|---|------|-------------|
| 1.1 | Open Chrome/Edge, navigate to the deployed PyKnowledge URL. | [ ] |
| 1.2 | Install as PWA (tap "Install" / "Add to Home screen"). | [ ] |
| 1.3 | Open the installed PWA. Confirm it loads without errors. | [ ] |
| 1.4 | Sign in with a profile + PIN (or use guest mode). Record which. | [ ] |
| 1.5 | Open lesson `lesson-1-1`. Confirm it loads. | [ ] |
| 1.6 | Tap "Take Quiz", answer the questions, submit. | [ ] |
| 1.7 | Confirm pass screen shows 70% or higher. | [ ] |
| 1.8 | Confirm lesson `lesson-1-1` shows "Done" badge and `lesson-1-2` is unlocked. | [ ] |
| 1.9 | Note the deployed `SW_VERSION` from live `core/sw-version.js`: __________ | [ ] |

Expected cache version at this stage: the deployed version's cache (read from live `core/sw-version.js`, NOT `0.9.1` unless the new build is already deployed).

---

## Test 2 — Deploy the new version; reopen online, tap Update Now, confirm progress persists

Prerequisite: Test 1 complete on the same device; new build (0.22.0 / cache `pyknowledge-v0.22.0`) deployed to the server.

| # | Step | PASS / FAIL |
|---|------|-------------|
| 2.1 | Make sure the device is online. Open the installed PWA (still controlled by the old service worker). | [ ] |
| 2.2 | Wait for the "A new version is available" refresh banner to appear. | [ ] |
| 2.3 | Tap "Update Now". | [ ] |
| 2.4 | Confirm the page reloads and the banner disappears. | [ ] |
| 2.5 | Confirm `core/version.js` reports `0.22.0` (DevTools Console: `import('./core/version.js').then(m => console.log(m.APP_VERSION))`). | [ ] |
| 2.6 | Confirm live `core/sw-version.js` reports `SW_VERSION = '0.22.0'` → cache `pyknowledge-v0.22.0`. | [ ] |
| 2.7 | Reopen the dashboard. Confirm lesson `lesson-1-1` still shows "Done". | [ ] |
| 2.8 | Confirm the quiz score for `lesson-1-1` is still shown. | [ ] |
| 2.9 | Confirm `lesson-1-2` still opens. | [ ] |

Expected cache version after this stage: `pyknowledge-v0.22.0`.

---

## Test 3 — Airplane mode: close and reopen; confirm login, lesson, exercise, quiz, next lesson all work offline

Prerequisite: Test 2 complete; device on the same installed PWA (0.22.0).

| # | Step | PASS / FAIL |
|---|------|-------------|
| 3.1 | Switch to airplane mode (confirm offline indicator shows). | [ ] |
| 3.2 | Close the app completely (swipe away / quit browser). | [ ] |
| 3.3 | Reopen the installed PWA. | [ ] |
| 3.4 | Confirm login works offline (profile + PIN accepted, or guest mode loads). | [ ] |
| 3.5 | Open a lesson (e.g. `lesson-1-1` or `lesson-1-2`). Confirm it loads offline. | [ ] |
| 3.6 | Open a write-code exercise. Confirm the code editor loads and the Run button works. | [ ] |
| 3.7 | Open a quiz. Confirm questions load and you can submit. | [ ] |
| 3.8 | Open the next lesson (e.g. `lesson-1-2`). Confirm it loads offline. | [ ] |

Expected cache version: `pyknowledge-v0.22.0` (no change; offline uses the cache).

---

## Test 4 — Clear site data; confirm progress is lost; record backup feature status

Prerequisite: Test 3 complete.

| # | Step | PASS / FAIL |
|---|------|-------------|
| 4.1 | In browser settings, clear site data / storage for the PyKnowledge origin (or uninstall and reinstall the PWA). | [ ] |
| 4.2 | Reopen the app. Confirm no profile is present (must sign in or use guest fresh). | [ ] |
| 4.3 | Confirm `lesson-1-1` no longer shows "Done" — progress is gone. | [ ] |
| 4.4 | Record: backup/restore feature is NOT built yet. Progress cleared here cannot be recovered. | [ ] |

Expected result: progress is permanently deleted. No backup exists.

---

## Test 5 — Reconnect; confirm the app updates again without errors

Prerequisite: Test 4 complete; device online again; new build (0.22.0) deployed.

| # | Step | PASS / FAIL |
|---|------|-------------|
| 5.1 | Reconnect to the internet (airplane mode OFF / network restored). | [ ] |
| 5.2 | Open the app. Confirm it loads without console errors. | [ ] |
| 5.3 | If an update banner appears, tap "Update Now". Confirm reload succeeds with no errors. | [ ] |
| 5.4 | Confirm `core/version.js` reports `0.22.0` and `core/sw-version.js` reports `SW_VERSION = '0.22.0'`. | [ ] |
| 5.5 | Confirm the app is usable (dashboard loads, lessons list appears). | [ ] |

Expected cache version: `pyknowledge-v0.22.0`.

---

## Pass criteria

All steps marked PASS. If any step fails, note the device, OS version, and exact error, then stop and investigate before deploying further.
