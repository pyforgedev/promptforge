# OpenCode Agent Instructions

## Project Context

> Tech stack, architecture, and project structure are documented in [`README.md`](./README.md#architecture-and-tech-stack).

## Development

Core commands:

```bash
npm run dev       # start the development server
npm run build     # TypeScript check + production build
npm run lint      # run ESLint
npm run test:run  # run the Vitest suite once — FULL suite, slow; avoid as routine check
```

> [!IMPORTANT]
> **Never run `npm run build` (or any build/typecheck command: `npx tsc *`, `npx vite build *`, etc.) without asking the user first.** Builds are slow, so do not run them as routine verification on every small change. Ask for explicit approval before each build; only run it when the user requests it or a build is strictly required for the current task. `npm run lint` may run freely as a routine check.

## Testing — Always Scoped, Never the Full Suite

> [!IMPORTANT]
> **Run only the tests that cover the change — never `npm run test:run` (full suite) as a routine check.** The full suite is slow (~2 minutes) and wasteful; it may only be run when the user explicitly requests it.

- Run scoped tests with `npx vitest run <file-or-files>` — never `npm run test:run`.
- Pick the test files that cover the touched code, colocated next to it (`*.test.ts`):

  ```bash
  # UI change → its component test(s)
  npx vitest run src/features/history/components/HistoryFilters.test.tsx

  # Storage/query change → the storage tests + any store/UI test that consumes it
  npx vitest run src/services/storage/history.test.ts src/services/storage/db.migration.test.ts

  # Store change → the store test and its consuming component tests
  npx vitest run src/store/useHistoryStore.test.ts src/features/history/components/HistoryFilters.test.tsx

  # Shared util/component change → the util/component test + direct consumers
  npx vitest run src/components/ui/combobox.test.tsx src/features/history/components/HistoryFilters.test.tsx

  # Multiple related files — pass them all in one command
  npx vitest run src/services/storage/retention.test.ts src/services/storage/retention.ts
  ```

- When in doubt about which files are affected, grep for the touched symbol or file name inside `*.test.*` and add all matches to the same command.
- Run lint (`npm run lint`) freely alongside scoped tests as the routine verification loop.

## Internationalization

All user-facing text — including UI labels and error messages — must be added as i18n keys in **both** `public/locales/en/translation.json` and `public/locales/id/translation.json`. Never hardcode user-facing strings directly in components.

## Documentation

- `docs/audit/*.md` files are **overwritten in place** by review agents (they represent the current state, not a running log).
- README updates are owned by the `@docs-writer` subagent.

## UI/UX

> Must read [`DESIGN.md`](./DESIGN.md) before making any UI/UX changes — it contains design tokens, glassmorphism rules, accessibility guidelines, and component patterns that must be followed.

## Git & Deployment

> [!IMPORTANT]
> Do not push, release, or deploy without explicit user confirmation. Every write git operation (commit, push, tag) and deployment command (vercel, npm run release*) MUST ask for user approval first. This policy is also enforced through permission rules in `opencode.json`.

## Release Process

This project uses [`release-it`](https://github.com/release-it/release-it) with conventional changelog for versioning and releases.

### Commands

```bash
npm run release          # interactive release
npm run release:patch    # patch bump (0.x.x)
npm run release:minor    # minor bump (x.0.x)
npm run release:major    # major bump (x.x.0)
```

Or directly: `npx release-it <increment> --ci`

### Release-it Config (`.release-it.json`)

- Commits: `chore: release v${version}`
- Tags: `v${version}`
- GitHub releases: auto-generated
- npm publish: disabled (private project)
- Changelog: auto-updated via `@release-it/conventional-changelog`
- Post-release hook: `vercel deploy --prod --yes`

### Vercel Deploy

The `vercel` CLI reads the `VERCEL_TOKEN` environment variable natively — **do not** pass it via `--token` flag (exposes secret in process args). The `--yes` flag skips interactive prompts in CI.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
