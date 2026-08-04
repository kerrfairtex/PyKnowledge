# PyKnowledge

**Offline Python Learning Platform** for remote areas with weak internet, zero hosting cost, and legacy hardware.

Designed for TRAC / BARMM / CHED curriculum alignment. The entire learning experience continues without Internet after first installation.

## Architecture

```
PyKnowledge/
├── app/                  # Business modules
│   ├── dashboard/        # Module selection & overview
│   ├── lessons/          # Lesson rendering
│   ├── quizzes/          # Quiz engine & scoring
│   └── progress/         # Progress dashboard
├── core/                 # Application kernel
│   ├── engine.js         # loadModule(), app bootstrap
│   ├── loader.js         # JSON content loading
│   ├── router.js         # Client-side routing
│   ├── storage.js        # LocalStorage wrapper
│   └── service-worker.js # Offline cache engine
├── content/              # Static learning assets
│   ├── lessons.json
│   ├── quizzes.json
│   └── assets/
├── storage/              # Domain persistence
│   ├── progress.js       # checkPrerequisite(), unlocking
│   └── achievements.js
├── ui/                   # Presentation layer
│   ├── components/
│   ├── themes/
│   └── assets/
├── utils/                # Parsers & validators
└── tests/                # Unit tests
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript ES6+ |
| Offline | Service Worker, Cache API, LocalStorage |
| Content | JSON |
| Media | MP4 H.264 720p |
| Backend | None — runs entirely in browser sandbox |

## Core Engine Functions

- `loadModule()` — loads and validates module access
- `calculateScore()` — quiz scoring with 70% pass threshold
- `checkPrerequisite()` — module unlocking logic
- Service Worker — cache-first offline strategy

## Quick Start

```bash
# Serve locally (requires network for first load only)
npm start

# Run tests
npm test

# Create release package
npm run package
```

Open `http://localhost:8080` in a browser. After the first visit, the app works fully offline.

## Performance Targets

- Page load: < 500 ms
- Hardware: Dual-core CPU, 2 GB RAM
- Storage: ~200–250 MB (with video content)

## Versioning

Semantic versioning via `package.json`. Service Worker cache is versioned (`pyknowledge-v0.1.0`) and invalidated on updates.

## License

MIT
