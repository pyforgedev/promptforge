# OpenCode Agent Instructions

## Project Context

> Tech stack, architecture, and project structure are documented in [`README.md`](./README.md#architecture-and-tech-stack).

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

### Semantic Commits

Follow [Conventional Commits](https://conventionalcommits.org):
- `feat:` → minor bump
- `fix:` → patch bump
- `BREAKING CHANGE:` → major bump
- `docs:`, `chore:`, `refactor:` → no version bump (still included in changelog)
