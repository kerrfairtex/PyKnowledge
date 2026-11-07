# PyKnowledge Release Checklist — v1.0.0

Manual verification steps to confirm students keep their progress and
receive the fix when they reconnect after a service-worker update.

## What changed

- App version: `0.9.0` → `1.0.0`
- Service worker cache version: `v0.21.1` → `v1.0.0`
- Fix: Next/Continue buttons after lessons and quizzes now work correctly.
- Progress lives in IndexedDB (preferred) with a localStorage mirror. Both
  survive a service-worker update because the activate handler only deletes
  old caches, never IndexedDB or localStorage.

---

## Test A — Low-end Android phone (Chrome)

Prerequisites: phone online for install and update, then airplane mode for
offline verification.

1. Install the old version.
   - Open Chrome, navigate to the deployed PyKnowledge URL (old build,
     0.9.0 / cache v0.21.1).
   - Tap Install / Add to Home screen when prompted.
   - Open the installed PWA from the home screen.
2. Complete lesson 1 and its quiz.
   - Sign in or use guest mode (progress is per-profile; guest key works).
   - Open lesson lesson-1-1, read it, tap Take the quiz above.
   - Pass the quiz. Confirm the footer/badge now shows Done for lesson 1.
   - Confirm lesson lesson-1-2 (next lesson) is unlocked and opens.
   - Note the lesson title and your score (you will check it later).
3. Deploy the new version.
   - Deploy 1.0.0 to the server (cache v1.0.0). Do NOT uninstall the old PWA.
4. Reconnect.
   - On the phone, turn airplane mode OFF so the phone is online.
   - Open the installed PWA (it may still be controlled by the old service worker).
5. Accept the update.
   - Wait for the A new version is available. refresh banner to appear.
   - Tap Update Now.
   - Confirm the page reloads and the banner disappears.
   - Confirm core/version.js reports 1.0.0 (open DevTools Console and run import('./core/version.js').then(m => console.log(m.APP_VERSION))).
6. Switch to airplane mode.
   - Turn airplane mode ON. Confirm the offline indicator shows.
7. Confirm progress is intact.
   - Reopen the dashboard. Confirm lesson lesson-1-1 still shows Done.
   - Confirm your quiz score for lesson 1 is still shown.
   - Confirm lesson lesson-1-2 still opens (it was unlocked before the update).
8. Confirm the next lesson opens.
   - Open lesson lesson-1-2. Confirm it loads and its quiz is reachable.
   - If you already completed it, confirm it still shows Done.

Pass criteria: progress (completed lessons, quiz scores, unlocked modules)
survives the update; offline mode works; the next lesson opens; no data loss.

---

## Test B — Shared PC (Chrome or Edge)

Prerequisites: PC online, then offline verification. Use a fresh or guest
profile so you start from zero.

1. Install the old version.
   - Open Chrome/Edge, navigate to the deployed PyKnowledge URL (old build,
     0.9.0 / cache v0.21.1).
   - Install the PWA (install button in the address bar or menu).
   - Open the installed PWA.
2. Complete lesson 1 and its quiz.
   - Use guest mode (no sign-in needed on a shared PC).
   - Open lesson lesson-1-1, take and pass the quiz.
   - Confirm lesson lesson-1-1 shows Done and lesson-1-2 is unlocked.
   - Note your quiz score.
3. Deploy the new version.
   - Deploy 1.0.0 to the server. Do NOT uninstall the PWA.
4. Reconnect.
   - Make sure the PC is online.
   - Open the installed PWA.
5. Accept the update.
   - Wait for the A new version is available. refresh banner.
   - Tap Update Now. Confirm reload and that APP_VERSION is 1.0.0.
6. Go offline.
   - Disable network (airplane mode, unplug Ethernet, or DevTools →
     Network → Offline).
7. Confirm progress is intact.
   - Dashboard shows lesson lesson-1-1 as Done; quiz score preserved.
   - Lesson lesson-1-2 still opens.
8. Confirm the next lesson opens.
   - Open lesson-1-2; confirm it loads offline and its quiz is reachable.

Pass criteria: progress survives, offline works, next lesson opens.

---

## What the update notifier does

- ui/components/update-notifier.js listens for updatefound on the service
  worker registration. When the new worker reaches installed state while an
  older controller is active, it shows a refresh banner:
  A new version is available. with Update Now and Dismiss buttons.
- Tapping Update Now posts SKIP_WAITING to the waiting worker, then
  reloads the page on controllerchange (with a 3s timeout fallback). The new
  service worker takes control via self.clients.claim() in its activate
  handler.
- Dismissing the banner only removes the banner; the update is still applied
  on the next navigation/reload.

## Why progress is not lost

- core/storage.js writes progress to IndexedDB (core/idb.js) with a
  localStorage mirror. The service worker activate handler deletes only
  caches whose name differs from CACHE_NAME (pyknowledge-v1.0.0). It never
  touches IndexedDB or localStorage.
- Completed lessons, quiz scores, achievements, and unlocked modules are all
  stored in IndexedDB/localStorage and survive a cache change.
