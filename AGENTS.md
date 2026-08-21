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
> **Never run `npm run build` (or any build/typecheck command: `npx tsc *`, `npx vite build *`, etc.) without asking the user first.** Builds are slow, so do not run them as routine verification on every small change. Ask for explicit approval before each build; only run it when the user requests it or a build is strictly required for the current task. `npm run lint` may run freely as a routine check. The sole exception is an already authorized release command: its release-it `before:init` build is pre-authorized and must run without another prompt (see [Release Process](#release-process)).

## Testing — Always Scoped, Never the Full Suite

> [!IMPORTANT]
> **Run only the tests that cover the change — never `npm run test:run` (full suite) as a routine check.** The full suite is slow (~2 minutes) and wasteful; it may only be run when the user explicitly requests it. The sole exception is an already authorized release command: its release-it `before:init` full suite is pre-authorized and must run without another prompt (see [Release Process](#release-process)).

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

[`docs/RELEASE.md`](./docs/RELEASE.md) is the canonical release runbook. Follow it exactly; do not improvise a manual release or deployment.

### Authorization and version choice

- A release requires explicit user authorization and a selected SemVer increment. Use `fix` changes for patch, `feat` changes for minor, and breaking changes for major.
- If the user has not selected an increment, inspect the commits, recommend one, and ask one concise patch/minor/major question. After the answer, execute the matching command without exploring manual alternatives.
- **RELEASE EXCEPTION:** normal development still requires scoped tests, and separate approval for the full suite or a build. Once the user explicitly authorizes a release and selects its increment, that authorization includes release-it's mandatory full-suite and build hooks for that release command. Do not ask again for individual hooks, and never skip or bypass them.

### Only permitted commands

Release-it through the local non-interactive npm scripts is the **only** permitted release and production deployment path:

```bash
npm run release:patch -- --ci
npm run release:minor -- --ci
npm run release:major -- --ci
```

Agents MUST NOT use the interactive `npm run release`. They MUST NOT manually edit the package version, run `npm version`, generate the changelog, create or amend the release commit, create or push a tag, run `gh release create`, or run a standalone `vercel deploy`. Never bypass hooks with release-it flags or configuration overrides. `VERCEL_TOKEN` is read from the environment; never print credentials or pass tokens in CLI arguments.

### Required workflow

1. Confirm the worktree is clean and all release-relevant changes are committed. Check the branch and remote state, and confirm required credentials are available without printing secrets. Never stash, revert, or commit another user's unrelated changes; use a clean temporary clone or worktree if necessary.
2. Run exactly one authorized command above. Release-it runs `npm run lint` → `npm run test:run` → `npm run build` sequentially and aborts before creating release artifacts if any gate fails. It then performs the version bump, changelog update, `chore: release v${version}` commit, tag, push, GitHub Release, and Vercel production deployment.
3. Do not treat a successful hook exit as sufficient. Confirm release-it succeeded, the tag exists locally and remotely, the GitHub Release exists, and the Vercel production deployment status is `Ready`. Read-only `gh release view`, `vercel ls --prod`, and `vercel inspect` are allowed for verification only.

### Failure recovery

- If lint, tests, or build fails, fix and verify the error, commit the fix, then rerun the same release-it command. No tag or GitHub Release should exist yet.
- If failure occurs after the tag or GitHub Release is published, never delete or rewrite the tag, amend published history, or reuse the version. Fix on `main` and publish the next patch through release-it.
- Never fall back to manual deployment. Diagnose and fix the release configuration, then deploy through release-it as part of the next patch release.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
