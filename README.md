# PyKnowledge

**Offline Python Learning Platform** for remote areas with weak internet, zero hosting cost, and legacy hardware.

Designed for TRAC / BARMM / CHED curriculum alignment. The entire learning experience continues without Internet after first installation.

## Architecture

```
PyKnowledge/
├── app/                  # Business modules (dashboard, lessons, quizzes, progress)
├── core/                 # Application kernel (engine, router, storage, service worker)
├── server/               # API server (Express + PostgreSQL + Prisma) — v0.4.0+
├── content/              # Static learning assets (lessons.json, quizzes.json, videos)
├── storage/              # Domain persistence (progress, achievements, auth)
├── ui/                   # Components, themes, assets
├── utils/                # Parsers, validators, sanitizers
├── tests/                # Client unit tests
├── scripts/              # Validation, packaging, version sync
└── docs/                 # Architecture and guides
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript ES6+ (PWA) |
| Backend | Node.js, Express, Prisma, PostgreSQL |
| Offline | Service Worker, Cache API, LocalStorage |
| Content | JSON with schema validation (+ API delivery) |
| Auth | Local PIN (offline) + JWT (server) |
| Quality | ESLint, Jest, GitHub Actions CI |

## Quick Start — Client Only (Offline)

```bash
npm install
npm run start:client     # http://localhost:8080
npm test                 # Client unit tests
```

## Quick Start — Full Stack

```bash
npm install
cp .env.example .env
npm run db:up            # Start PostgreSQL (Docker)
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:server     # API on http://localhost:3000
npm run start:client     # PWA on http://localhost:8080
```

Enable API in the client (`index.html` or browser console):
```javascript
window.PYKNOWLEDGE_API_URL = 'http://localhost:3000';
```

See [docs/FULLSTACK_ARCHITECTURE.md](docs/FULLSTACK_ARCHITECTURE.md) for details.

## API Endpoints (v0.4.0)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check + database status |
| GET | `/api/content/lessons` | CHED curriculum lessons |
| GET | `/api/content/quizzes` | Quiz definitions |
| POST | `/api/auth/register` | Create server account |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Current user (JWT required) |

## Core Engine Functions

- `loadModule()` — loads and validates module access
- `calculateScore()` — quiz scoring with 70% pass threshold
- `checkPrerequisite()` — module unlocking logic
- Service Worker — cache-first offline strategy

## Performance Targets

| Metric | Target |
|--------|--------|
| Page load | < 500 ms |
| Hardware | Dual-core CPU, 2 GB RAM |
| Storage | ~200–250 MB (with video content) |

## Documentation

- [Full-Stack Architecture](docs/FULLSTACK_ARCHITECTURE.md) — server setup and API
- [Authentication](docs/AUTHENTICATION.md) — local PIN + server JWT
- [Architecture](docs/ARCHITECTURE.md) — system design and data flow
- [Content Authoring](docs/CONTENT_AUTHORING.md) — lessons and quizzes
- [Contributing](CONTRIBUTING.md) — development conventions
- [Changelog](CHANGELOG.md) — version history

## Versioning

Semantic versioning via `package.json`. Current version: **0.4.0**

## License

MIT
