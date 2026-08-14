# Changelog

All notable changes to PyKnowledge are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-08-04

### Added
- **Full-stack server** (`server/`) — Express API + PostgreSQL + Prisma ORM
- Docker Compose for local PostgreSQL
- Content API: `GET /api/content/lessons`, `/quizzes`, `/manifest`
- Auth API skeleton: register, login, JWT, `/api/auth/me`
- Database schema: institutions, users, content_manifests, progress
- Content seed script from `content/*.json`
- Client `core/api.js` — API-first loader with static JSON fallback
- `docs/FULLSTACK_ARCHITECTURE.md` — full-stack setup guide
- Server integration tests (supertest)
- CI: PostgreSQL service + migrate + seed + server tests

### Changed
- `core/loader.js` tries API when `PYKNOWLEDGE_API_URL` is set and online
- Dashboard route remains `#/dashboard`; home at `#/`
- Bumped version to 0.4.0
- Fixed broken video reference in `lesson-1-1` (set to null)
- Updated `docs/ARCHITECTURE.md` security and deployment sections

## [0.3.1] - 2026-08-04

### Added
- Project front page at `#/` with hero, regional context, design, and development sections
- TRAC / BARMM / CHED target area showcase with performance stats
- Design philosophy and development stack documentation on landing page
- Architecture flow visualization and stakeholder governance section
- `ui/themes/landing.css` for landing page styles
- Dashboard moved to `#/dashboard`; navbar updated with Home link

## [0.3.0] - 2026-08-04

### Added
- **Local authentication** — student profiles with PIN (PBKDF2 hashed via Web Crypto)
- Profile picker UI for shared school computers
- Guest mode for quick access without a profile
- Per-user progress isolation in LocalStorage
- Session management with 30-minute idle timeout
- **Design system** — expanded tokens, gradients, typography, card polish
- **Animation system** — page transitions, staggered entrances, hover effects
- Achievement celebration overlay animation
- Quiz result scale-in animation
- PIN shake animation on wrong entry
- `ui/themes/animations.css` with `prefers-reduced-motion` support
- Auth documentation (`docs/AUTHENTICATION.md`)
- 12 new auth/crypto tests (35 total)

### Changed
- Dashboard shows personalized greeting for logged-in users
- Navbar displays user avatar and sign-out button
- Progress bar fill uses smooth cubic-bezier animation
- Bumped version to 0.3.0

## [0.2.0] - 2026-08-04

### Added
- ESLint configuration with flat config
- GitHub Actions CI pipeline (lint, test, validate, package, perf)
- Content JSON schema validation with integrity checks
- HTML sanitization (XSS prevention) across all renderers
- Centralized error handling with retry support
- Toast notification system
- Offline/online connectivity indicator
- Service worker update notification banner
- Loading skeleton UI during route transitions
- Skip-to-content link and focus management (a11y)
- Keyboard shortcut: Escape returns to dashboard
- 404/not-found pages for missing routes and content
- Expanded test suite (sanitize, schema, content integrity)
- Performance smoke test script
- Version sync validation script
- CHANGELOG, CONTRIBUTING, and documentation guides
- EditorConfig and .nvmrc for consistent development

### Changed
- Bumped version to 0.2.0
- Service worker cache includes all new modules
- All dynamic HTML now uses escapeHtml()
- Content loader validates schemas on load
- Router shows skeleton loader during navigation
- Quiz retry uses event listener instead of inline onclick

### Security
- Input sanitization on all user-facing rendered content
- Defense-in-depth HTML sanitization utility
- noscript fallback for non-JS environments

## [0.1.0] - 2026-08-04

### Added
- Initial offline-first PWA foundation
- Core engine: loadModule(), calculateScore(), checkPrerequisite()
- Three business modules: Content, Assessment, Progress
- Service Worker with cache-first strategy
- CHED-aligned sample content (2 modules, 5 lessons, 5 quizzes)
- LocalStorage progress persistence and achievements
- Jest unit tests and release packaging
