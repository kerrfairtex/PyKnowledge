PYKNOWLEDGE FRONTEND DESIGN BRIEF
Save as docs/DESIGN_BRIEF.md. Start every task with: "Read docs/DESIGN_BRIEF.md, then do TASK n only."

0. ROLE
Senior frontend engineer + UI designer. Ship a professional-grade, futuristic, maximalist, realistic hacker-terminal UI for PyKnowledge, an offline-first Python learning PWA for TRAC/BARMM/CHED students in Tawi-Tawi. Plain HTML/CSS/ES modules only.

1. HARD CONSTRAINTS
- Device: dual-core CPU, 2GB RAM. Load <=500ms. Fully offline after install.
- No new libraries, CDN, external requests, build step, GSAP, or CSS nesting (write flat CSS).
- Do NOT change routes, route guards, storage keys, content JSON, or auth logic. storage/auth.js is the only PIN hash/verify path: never hardcode or bypass a PIN. PIN = digits only, 4+ digits. Guest mode and a 30-min idle session exist.
- Keep these hooks: #landing-root #spa-root #main-content #syncStatus #offlineIndicator .page-content (auto-animated by animatePageEnter) showSkeleton renderNavbar updateNavbarActiveState initOfflineIndicator initCacheProgress initInstallPrompt.
- Every new css/js/font file must be added to the service-worker precache list, the cache version bumped, and offline tested.
- Images: school seal + campus/place photos in ui/assets/place only. No portraits.

2. STEP 0: DISCOVERY (run first, paste raw output, design nothing until done)
  ls -la *.html
  grep -rn "landing-root\|spa-root" --include=*.html --include=*.js .
  grep -n "registerRoute\|guard\|requireAuth" core/router.js core/engine.js
  ls ui ui/themes; find . -name "*.css" -not -path "./node_modules/*"
  grep -rln "skulpt\|pyodide" --include=*.js --include=*.html .
  grep -n "CACHE\|PRECACHE" core/service-worker.js
Resolve: (a) one html file or two? (b) route form /module/:id or ?id=? (c) is a Python runtime present? (d) which CSS file styles which screen?

3. KNOWN STRUCTURE (unverified; correct after Step 0)
- index.html: #landing-root (public) + #spa-root (hash SPA), swapped on hashchange; core/engine.js lazy-loads for #/login, #/dashboard.
- Routes: /login /dashboard /module/:id /lesson/:id /quiz/:id /progress /library /about. All but /login need auth.
- Files: app/auth/auth-screen.js, app/dashboard/dashboard.js, app/lessons/lesson-viewer.js, app/quizzes/quiz-engine.js, app/progress/progress-dashboard.js, ui/components/{navbar,offline-indicator,animations,loading}.js, storage/{auth,progress}.js, core/{engine,router,storage,loader,service-worker}.js, content/{lessons,quizzes}.json.
- Content: 9 modules, 28 lessons, 116 exercises. Exercise types: predict_output, write_code, fix_the_code, parsons, challenge (hints, misconceptions, remediationExerciseId). Quiz types: multiple-choice, true-false, fill-blank. Pass >=70%. Modules and lessons unlock sequentially.
- Auth states: no profiles -> welcome/create; profiles -> picker -> PIN; authed -> /dashboard. Also "Continue as Guest" and "Download App".
- Landing: topbar, hero (Code|Output tabs; Nova is a client-side keyword bot), curriculum, offline, about, footer with install + sync status.

4. DESIGN LANGUAGE: "PyKnowledge OS"
Principle: every readout shows a REAL value (cache count, online state, progress, storage). No fake decoration, no fake code execution. Maximalist = dense, layered, consistent, not chaotic.
Tokens: one file ui/themes/tokens.css, loaded by BOTH roots. No hardcoded colors anywhere.
  --bg #04090b --panel #08131a --panel-2 #0b1b24 --line #12332b --text #cfe8dc --dim #6f8f84
  --ok #3dff9a (success/progress/primary) --warn #ffb000 (locked/hints) --info #29d3ff (links/focus) --err #ff4d5e --glitch #ff2bd6 (glitch layers only)
  radius 0-4px; 1px lines; spacing 4/8/12/16/24/32; --dur 120/240/480ms; --ease cubic-bezier(.2,.8,.2,1)
Type: JetBrains Mono 400+700 (self-hosted, Latin subset, font-display:swap, <=60KB total) for chrome, HUD, and code. Keep the existing readable sans for lesson prose. rem units, tabular-nums, body >=16px.
Shape: sharp, 1px borders, corner brackets (8px L-shapes), dashed dividers. NO backdrop-filter, NO glass, NO radius >4px.
Themes: green (default), amber, ice, by overriding <=10 tokens with [data-theme]. Persist the choice.
Commands: a plain registry array of {id,label,keywords,run}. Adding an action = adding one entry.

5. EFFECT TIERS: <html data-fx="off|lite|full">
Auto-pick: prefers-reduced-motion -> off; deviceMemory<=2 or hardwareConcurrency<=2 -> lite; else a 500ms rAF probe (<45fps -> lite). User override in settings and via the palette.
- OFF: flat static terminal look, no effects.
- LITE: scanlines (<=3% alpha), vignette, cursor blink (steps), typewriter, count-up, press feedback, text-shadow glow on headings only.
- FULL: adds RGB-split glitch (<=300ms, only on route change / wrong answer / unlock), landing rain of Python tokens (def for >>> 0 1; <=20 columns, <=15fps, paused offscreen), SVG sparklines, node pulse.
Motion primitives (token-driven classes, no new keyframes per use): rise, fade, pop, slide, wipe, blink, glow, shimmer, ring-fill, bar-fill(scaleX), count-up, shake, ripple, glitch, type, stagger(--i).
Rules: animate transform/opacity only; every overlay gets pointer-events:none; <=3 things animating per screen; no flashing >3 times/sec; no infinite loops on lesson or quiz surfaces; pause control for looping backgrounds; typewriter text stays in the DOM for screen readers; never color-only meaning (add [OK]/[FAIL]/icons); :focus-visible only (2px --info); contrast >=4.5:1.

6. SCREENS
Shell: top status bar, ONE row <=48px, never wraps: {user}@pyknowledge:~/route + live pill (ONLINE / OFFLINE-READY n/n) using #syncStatus/#offlineIndicator. Mobile bottom tab bar in the SPA: HOME, MISSIONS (modules), PROGRESS, LIB, YOU. Landing keeps a top bar only. Command palette via >_ button / Ctrl+K. Footer: dynamic year, real version + cache name.
Landing: boot log fed by initCacheProgress() real counts (first visit only, <=2s, tap to skip). Typed headline. Code|Output become a terminal pane with line numbers and a visible horizontal-scroll cue. Label the Nova demo as simulated unless real Python runs. Stats as telemetry ("NET REQUIRED 0 KB", "LOAD <500ms"). Curriculum band as a node-graph preview.
Auth: never a blank card. Empty state: "no profiles found" + visible [create profile] + [continue as guest]. Profile rows: "uid=1001 name". PIN = "[sudo] PIN for name:" with an in-page keypad: readonly input + inputmode="none", buttons 0-9, backspace, ENTER, taps on click (pointerdown for haptic/press style only; never preventDefault on touchstart), physical keyboard support, no maxLength 4, dot indicators + aria-live count, navigator.vibrate(8) if supported. Wrong: shake + "ACCESS DENIED (n left)". Right: "ACCESS GRANTED" wipe. The primary action stays visible with the keypad open.
Dashboard: typed "> whoami" greeting. Overall progress = 28-cell memory map (done = --ok, current = glow, locked = hatched --warn). Module cards as nodes with chips [DONE] [OPEN] [LOCKED: finish M{n}]. Continue = primary button. Stats = value+unit split ("0 KB"), label below, never wrapping. Tip rendered as "$ fortune".
Module: sequential lesson nodes with connectors and per-lesson state.
Lesson: mobile tabs READ | CODE | OUT (desktop split: prose left, REPL right). Prose in the readable sans, no hover effects. Code with line numbers, ">>>", RUN + Ctrl+Enter. By exercise type: predict_output = commit guess then reveal; write_code = editor + test output; fix_the_code = red/green diff; parsons = tap-to-order lines; challenge = spec + hints. Hints as "hint --level 1/2/3"; misconceptions as traceback-style feedback; remediation as "PATCH AVAILABLE".
Quiz: calm, one question per screen, segmented progress, immediate [OK]/[FAIL] + explanation. Result: score vs 70%. Pass -> "MODULE n+1 UNLOCKED" sequence. Fail -> "62% - need 70%" + review link.
Progress/Library/About: telemetry cards + sparklines from real progress data (completedLessons, quizScores, achievements); achievements as system badges; Library as a file-tree list; About shares content with the landing.

7. ACCEPTANCE TESTS (from the real phone recording; all must pass)
 1. Profile picker never shows a blank card; create + guest actions visible.
 2. Create-profile and PIN screens keep the primary button visible with the keypad open.
 3. Header/nav is one row at <=480px; first screen is content, not chrome.
 4. The "0 internet" stat cannot wrap or overflow.
 5. 0% progress shows 28 visible empty cells, not a dead track.
 6. Code panes scroll horizontally with a visible cue; no clipped text.
 7. No yellow focus ring on touch.
 8. Landing and app share one token file and one shell look.
 9. Offline works after install (airplane-mode test); cache version bumped.
 10. Load <=500ms on the device; FX JS <=15KB. Matrix rain module <=6KB min / <=2.5KB gzip.

8. OUTPUT FORMAT (every task)
 1) Real selectors/ids found (grep output)  2) Plan, <=5 bullets  3) Unified diff, one file/screen  4) Verification commands + raw output  5) NOT verified
Never write a checkmark without command output. If a task conflicts with section 1, stop and ask.

9. TASKS (one per session)
 T1 tokens + shell (tokens.css, status bar, tab bar, fx detector, command registry)
 T2 auth (blank-state fix + keypad)
 T3 dashboard  T4 landing  T5 lesson viewer + exercise UIs  T6 quiz + results
 T7 progress/library/about + palette UI  T8 polish (themes, glitch/rain, a11y + perf audit)
