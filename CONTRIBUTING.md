# Contributing to PromptForge

Thanks for your interest in contributing! This guide covers the essentials for working on the codebase. Please also read [`README.md`](./README.md) (architecture, routes, scripts) and [`DESIGN.md`](./DESIGN.md) (design system) before making changes.

## Development Setup

1. **Prerequisites:** Node.js >= 22.12 (see `engines` in package.json) and npm.
2. **Install:**
   ```bash
   git clone https://github.com/pyforgedev/promptforge.git
   cd promptforge
   npm install
   ```
3. **Run:**
   ```bash
   npm run dev     # dev server at http://localhost:5173
   ```

## Available Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | TypeScript validation + production build |
| `npm run lint` | ESLint checks |
| `npm run test` | Vitest in watch mode |
| `npm run test:run` | Vitest, single run (used by CI) |
| `npm run preview` | Preview the production build locally |
| `npm run release*` | Versioned releases (maintainers only) |

## Project Layout (short version)

- `src/app/` — routing: route definitions, lazy-loaded page imports, providers
- `src/pages/` — page components (thin wrappers)
- `src/features/` — self-contained feature modules (components, hooks, services, stores, schemas, types, tests colocated)
- `src/components/` — shared components (`animations/` for React Bits, `common/`, `layout/`, `ui/` = shadcn primitives)
- `src/services/` — external integrations & core logic (AI clients, Dexie storage, export, similarity)
- `src/store/` — global Zustand stores
- `src/lib/` — utilities (crypto, constants, validation)

## Project Structure Conventions

- **Page components** — every page component lives in `src/pages/` with a uniform `*Page.tsx` suffix (e.g. `HomePage.tsx`, `SettingsPage.tsx`, `NotFoundPage.tsx`). The lazy-load barrel in `src/app/pages.tsx` imports from these names.
- **Animated components** — React Bits animated components live in `src/components/animations/` as vendored, read-only TSX files (e.g. `SpotlightCard.tsx`, `Aurora.tsx`, `SplitText.tsx`). See [DESIGN.md §0](./DESIGN.md) for the component-selection priority and the one-time token-alignment policy.
- **Feature folders** — feature directories under `src/features/` (and shared `src/components/` subfolders) should stay flat by default. Only add a subfolder when the feature's component count or internal complexity (engine, hooks, services, store, schemas) justifies the extra nesting. Colocating tests (`*.test.ts`) next to the code they cover is always allowed regardless of nesting.

## Code Conventions

- **TypeScript strict** — no `any` where avoidable; existing types are the source of truth in `src/types/` and feature `types/` folders.
- **No comments unless they explain *why*** — avoid leftover scaffolding or generated notes.
- **UI must follow `DESIGN.md`** — semantic color tokens, glassmorphism rules for floating elements, no hardcoded hex values.
- **i18n:** every user-facing string goes through `useTranslation()` (components) or the `i18n` instance (stores/services). Add strings to **both** `public/locales/en/translation.json` and `public/locales/id/translation.json` with identical key sets.
- **Storage access** goes through `src/services/storage/` — stores/components must not touch Dexie directly.
- **Route paths** come from the centralized constants (see `src/app/`) — never hardcode `'/generator'`-style literals outside them.
- **Tests** live next to the code they cover (`*.test.ts`). Run `npm run test:run` before opening a PR.

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) — this drives automated versioning via release-it:

Format: `<type>(<scope>): <subject>`

| Type | Purpose | Version bump |
|---|---|---|
| `feat` | New feature | minor |
| `fix` | Bug fix | patch |
| `refactor` | Refactoring, no behavior change | — |
| `perf` | Performance improvement | — |
| `docs` | Documentation only | — |
| `test` | Test additions or corrections | — |
| `build` / `ci` | Build system / CI config | — |
| `chore` | Maintenance | — |
| `style` | Formatting, no logic change | — |

Subject rules:

- Imperative mood, capitalized first letter — "Add feature", not "Added feature"
- No trailing period; keep under 72 characters
- Use a scope in parentheses when specific: `feat(history): add folder export`

Body: explain what and why, not how. Base the message on the actual staged diff (`git diff --staged`), not a guess. Reference issues in the footer with `Fixes`/`Refs` (e.g. `Fixes SENTRY-1234`).

Breaking changes: use `!` in the subject (`feat(api)!: ...`) and a `BREAKING CHANGE:` footer — this bumps the major version.

Examples: `fix(generator): abort stale requests on unmount`, `feat(formatter): add CSV column picker`.

## Pull Request Workflow

1. Create a branch from `main` (`git checkout -b feat/my-feature`).
2. Make your changes; keep PRs small and focused.
3. Run the full quality gate locally: `npm run lint && npm run test:run && npm run build`.
4. Fill out the PR template (there is one — it is required).
5. CI must pass before merge. A maintainer will review and merge.

## Releasing (maintainers only)

```bash
npm run release:patch   # 0.4.0 → 0.4.1
npm run release:minor   # 0.4.1 → 0.5.0
npm run release:major   # 0.5.0 → 1.0.0
```

Releases create a git tag, GitHub release, and trigger a Vercel production deploy. Never run these without an explicit go-ahead from the team.

## Questions?

Open a GitHub Discussion or an issue tagged `question`.
