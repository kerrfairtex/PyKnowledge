# PyKnowledge — Copilot Context

- Client-only, offline-first PWA. No frameworks (no React/Bootstrap). Vanilla JS ES6+, HTML5, CSS3 only.
- No build step — code runs as-is from source ES modules.
- Hardware target: dual-core CPU, 2GB RAM, 1024×768 minimum display.
- Codebase budget: <5MB (excluding video content).
- All user-facing text must pass through utils/sanitize.js's escapeHtml() before rendering.
- Progress persists via core/storage.js (LocalStorage), keyed pyknowledge_progress_${userId}.
- Auth is local PIN only (storage/auth.js) — no server auth in this mode.
- Follow existing patterns in storage/progress.js and storage/achievements.js for new modules.