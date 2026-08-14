# Contributing to PyKnowledge

Thank you for contributing to PyKnowledge. This guide covers development setup, conventions, and the contribution workflow.

## Development Setup

```bash
git clone https://github.com/kerrfairtex/PyKnowledge.git
cd PyKnowledge
npm install
npm start        # http://localhost:8080
```

Requirements: Node.js 18+ (see `.nvmrc`).

## Project Structure

```
app/        Business modules (dashboard, lessons, quizzes, progress)
core/       Application kernel (engine, router, storage, service worker)
content/    Static JSON content and media assets
storage/    Domain persistence (progress, achievements)
ui/         Components, themes, assets
utils/      Parsers, validators, sanitizers
tests/      Unit tests
scripts/    Build, validation, and packaging utilities
docs/       Documentation
```

## Development Workflow

1. Create a branch from `main`: `git checkout -b cursor/your-feature-751b`
2. Make changes following existing code conventions
3. Run quality checks before committing:

```bash
npm run lint
npm test
npm run validate:content
npm run check:version
```

4. Commit with a clear message describing what and why
5. Push and open a pull request

## Code Conventions

- **ES Modules** — all JavaScript uses `import`/`export`
- **Vanilla JS** — no frameworks; runs entirely in the browser
- **Sanitization** — always use `escapeHtml()` when rendering dynamic content into HTML
- **No inline event handlers** — use `addEventListener` instead of `onclick` attributes
- **Accessibility** — include ARIA labels, roles, and keyboard support for interactive elements
- **Offline-first** — every new static asset must be added to `core/service-worker.js`

## Adding Content

See [docs/CONTENT_AUTHORING.md](docs/CONTENT_AUTHORING.md) for the JSON schema and content workflow.

After editing content files, run:

```bash
npm run validate:content
```

## Versioning

When releasing a new version:

1. Update `version` in `package.json`
2. Update `APP_VERSION` in `core/version.js`
3. Update `APP_VERSION` in `core/service-worker.js` (cache name)
4. Run `npm run check:version` to verify sync
5. Add entry to `CHANGELOG.md`

## Testing

```bash
npm test              # All unit tests
npm run test:perf     # Performance smoke test
npm run package       # Create release zip
```

## Pull Request Guidelines

- Keep changes focused and minimal
- Include tests for new logic
- Update documentation when adding features
- Ensure CI passes before requesting review
