# PyKnowledge Full-Stack Architecture (v0.4.0)

## Overview

The full-stack layer is an **optional enhancement** to the offline-first PWA. The client continues to work without the server; when the API is available, it provides content delivery, server authentication, and progress persistence.

```
┌─────────────────────────────────────────────────────────────┐
│  Client PWA (browser)                                        │
│  core/loader.js → API first → fallback to content/*.json      │
│  core/storage.js → LocalStorage + sync queue (future)         │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP (when online)
┌──────────────────────────▼──────────────────────────────────┐
│  server/ (Node.js + Express)                                   │
│  /api/health  /api/content/*  /api/auth/*                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  PostgreSQL (Prisma ORM)                                       │
│  institutions, users, content_manifests, progress               │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Install and migrate
npm install
npm run db:migrate
npm run db:seed

# 3. Start API server
npm run start:server

# 4. Start client (separate terminal)
npm run start:client
```

API: `http://localhost:3000`  
Client: `http://localhost:8080`

Configure client API URL in browser console or `index.html`:
```html
<script>window.PYKNOWLEDGE_API_URL = 'http://localhost:3000';</script>
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check + DB status |
| GET | `/api/content/manifest` | No | Active content version |
| GET | `/api/content/lessons` | No | Full lessons JSON (CHED curriculum) |
| GET | `/api/content/quizzes` | No | Full quizzes JSON |
| POST | `/api/auth/register` | No | Create server account |
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/auth/me` | JWT | Current user profile |

## Database Schema

| Table | Purpose |
|-------|---------|
| `institutions` | TRAC, BARMM schools |
| `users` | Server accounts (student/instructor/admin) |
| `content_manifests` | Published lessons + quizzes JSON blobs |
| `progress` | Server-side lesson completion records |

## Environment Variables

See `.env.example` at repository root.

## Offline-First Guarantee

- Client `core/loader.js` tries API when `PYKNOWLEDGE_API_URL` is set and `navigator.onLine`
- On API failure, falls back to static `content/lessons.json` and `content/quizzes.json`
- Service Worker caches both API responses and static JSON

## Roadmap

- [x] Phase 0: Merge client to main baseline
- [x] Phase 1: Server scaffold + content API + auth skeleton
- [ ] Phase 2: Progress sync (`POST /api/progress/sync`)
- [ ] Phase 3: Admin CMS
- [ ] Phase 4: Multi-tenant + instructor dashboard
