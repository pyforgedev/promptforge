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
- `src/components/` — shared components (`common/`, `layout/`, `ui/` = shadcn primitives)
- `src/services/` — external integrations & core logic (AI clients, Dexie storage, export, similarity)
- `src/store/` — global Zustand stores
- `src/lib/` — utilities (crypto, constants, validation)

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

- `feat:` → minor bump
- `fix:` → patch bump
- `BREAKING CHANGE:` → major bump
- `docs:`, `chore:`, `refactor:`, `test:` → no version bump

Examples: `feat(history): add folder export`, `fix(generator): abort stale requests on unmount`.

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
