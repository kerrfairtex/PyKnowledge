# PyKnowledge

**Offline Python Learning Platform** for remote areas with weak internet, zero hosting cost, and legacy hardware.

Designed for TRAC / BARMM / CHED curriculum alignment. The entire learning experience continues without Internet after first installation.

## Architecture

```
PyKnowledge/
├── app/                  # Business modules (dashboard, lessons, quizzes, progress)
├── core/                 # Application kernel (engine, router, storage, service worker)
├── content/              # Static learning assets (lessons.json, quizzes.json, videos)
├── storage/              # Domain persistence (progress, achievements)
├── ui/                   # Components, themes, assets
├── utils/                # Parsers, validators, sanitizers
├── tests/                # Unit tests
├── scripts/              # Validation, packaging, version sync
└── docs/                 # Architecture and content authoring guides
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript ES6+ |
| Offline | Service Worker, Cache API, LocalStorage |
| Content | JSON with schema validation |
| Media | MP4 H.264 720p |
| Backend | None — runs entirely in browser sandbox |
| Quality | ESLint, Jest, GitHub Actions CI |

## Core Engine Functions

- `loadModule()` — loads and validates module access
- `calculateScore()` — quiz scoring with 70% pass threshold
- `checkPrerequisite()` — module unlocking logic
- Service Worker — cache-first offline strategy with update notifications

## Quick Start

```bash
npm install
npm start              # http://localhost:8080
npm test               # Run unit tests (35 tests)
npm run lint           # ESLint
npm run validate:content  # Validate JSON schemas
npm run package        # Create release zip
```

Open `http://localhost:8080` in a browser. After the first visit, the app works fully offline.

## Professional Features (v0.3.0)

- **Local authentication** — student profiles with PIN (PBKDF2 hashed), guest mode
- **Per-user progress** — isolated learning data on shared school computers
- **Design system** — gradients, tokens, polished cards and typography
- **Animations** — page transitions, staggered entrances, achievement celebrations
- Content JSON schema validation with integrity checks
- XSS sanitization on all rendered content
- Offline/online connectivity indicator
- Service worker update banner
- Accessibility: skip links, ARIA labels, keyboard navigation, reduced motion
- CI pipeline: lint, test, validate, package, performance checks

## Performance Targets

| Metric | Target |
|--------|--------|
| Page load | < 500 ms |
| Hardware | Dual-core CPU, 2 GB RAM |
| Storage | ~200–250 MB (with video content) |

## Documentation

- [Authentication](docs/AUTHENTICATION.md) — local profiles, PIN, guest mode
- [Architecture](docs/ARCHITECTURE.md) — system design and data flow
- [Content Authoring](docs/CONTENT_AUTHORING.md) — how to add lessons and quizzes
- [Contributing](CONTRIBUTING.md) — development setup and conventions
- [Changelog](CHANGELOG.md) — version history

## Versioning

Semantic versioning via `package.json`. Current version: **0.3.0**

## License

MIT
