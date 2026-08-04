# Changelog

All notable changes to PyKnowledge are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
