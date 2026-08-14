# PyKnowledge Architecture

## System Overview

PyKnowledge is an offline-first Progressive Web Application (PWA) that delivers Python programming education without requiring a backend server, database, or internet connection after initial installation.

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │    UI    │  │   App    │  │    Core      │  │
│  │Components│→ │ Modules  │→ │   Engine     │  │
│  └──────────┘  └──────────┘  └──────┬───────┘  │
│                                       │          │
│  ┌──────────┐  ┌──────────┐  ┌──────▼───────┐  │
│  │  Cache   │← │ Service  │  │  LocalStorage│  │
│  │   API    │  │ Worker   │  │  (progress)  │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
│                                       │          │
│                              ┌────────▼───────┐  │
│                              │  JSON Content  │  │
│                              │ lessons.json   │  │
│                              │ quizzes.json   │  │
│                              └────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Layer Responsibilities

### Core (`core/`)

| Module | Responsibility |
|--------|---------------|
| `engine.js` | Application bootstrap, route registration, `loadModule()` |
| `router.js` | Hash-based SPA routing with 404 handling |
| `loader.js` | JSON fetching with schema validation |
| `storage.js` | LocalStorage wrapper for `pyknowledge_progress` |
| `errors.js` | Centralized error rendering and recovery |
| `service-worker.js` | Cache-first offline strategy |
| `version.js` | Single source of truth for app version |

### App Modules (`app/`)

| Module | Responsibility |
|--------|---------------|
| `dashboard/` | Module selection, progress overview |
| `lessons/` | Lesson content rendering, video player |
| `quizzes/` | Quiz UI, `calculateScore()` |
| `progress/` | Detailed progress and achievements view |

### Storage (`storage/`)

| Module | Responsibility |
|--------|---------------|
| `progress.js` | `checkPrerequisite()`, module unlocking, progress calculation |
| `achievements.js` | Achievement definitions and unlock detection |

### Utils (`utils/`)

| Module | Responsibility |
|--------|---------------|
| `sanitize.js` | XSS prevention via HTML escaping |
| `schema.js` | JSON content validation |
| `parser.js` | Lesson content parsing |
| `validator.js` | Quiz answer validation |

## Data Flow

```
Launch → Service Worker install → Cache assets
  → Load & validate JSON content
  → Render Dashboard
  → Select Module → checkPrerequisite()
  → Select Lesson → Render content + video
  → Take Quiz → calculateScore()
  → Pass → Save to LocalStorage → Unlock next lesson
  → Dashboard update
```

## Offline Strategy

1. **Install**: Service Worker caches all static assets on first visit
2. **Runtime**: Cache-first fetch — serve from cache, fall back to network
3. **Updates**: New SW version triggers update banner; user chooses when to reload
4. **Offline**: Cached content served; offline indicator shown

## Performance Targets

| Metric | Target |
|--------|--------|
| Page load | < 500 ms |
| CPU | Dual-core |
| RAM | 2 GB minimum |
| Storage | 200–250 MB (with videos) |

## Security Model

- Client runs entirely in browser sandbox; optional server API for sync and governance
- Content rendered through `escapeHtml()` sanitization
- **Local auth (offline):** Device PIN profiles with PBKDF2 hashing (v0.3.0+)
- **Server auth (online):** JWT-based accounts when API is available (v0.4.0+)
- Content validated against schema before rendering (client and server)
- No external API calls required after PWA cache install

## Testing Strategy

| Layer | Tool | Coverage |
|-------|------|----------|
| Unit tests | Jest | Scoring, prerequisites, sanitization, schema |
| Content validation | Custom script | JSON schema + integrity |
| Performance | Smoke test | File read latency < 500ms |
| CI | GitHub Actions | Lint + test + validate + package |

## Deployment

PyKnowledge supports two deployment modes:

### Offline-only (client)
1. **Zip package**: `npm run package` → copy to USB drive
2. **Static host**: Deploy files to any HTTP server (first visit caches for offline)
3. **Local file**: Serve via `npm start` or any static file server

### Full-stack hybrid (v0.4.0+)
1. **Docker Compose**: `docker compose up` — PostgreSQL + API server
2. **Client + API**: PWA loads content from API when online; falls back to cached JSON offline
3. See `docs/FULLSTACK_ARCHITECTURE.md` for server setup

No build step required for client runtime — the app runs as-is from source ES modules.
