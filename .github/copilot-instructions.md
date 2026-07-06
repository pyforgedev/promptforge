# Commit Message Conventions

Use conventional commits for all commits:

| Type | When to use |
|------|-------------|
| `feat:` | New user-facing or internal functionality |
| `fix:` | Bug fixes |
| `chore:` | Tooling, deps, config, examples, templates |
| `docs:` | Documentation changes |
| `refactor:` | Code restructuring (no behavior change) |
| `style:` | Formatting, code style |
| `test:` | Adding/fixing tests |
| `ci:` | CI/CD changes |

Rules:
- One logical change per commit
- Use lowercase for prefix and message
- Be specific (e.g., `chore: add .dockerignore` not `chore: update`)
- For breaking changes, add `BREAKING CHANGE: <desc>` in footer
- Use imperative mood in description (e.g., "add", not "added" or "adds")

Example: `feat: add product gallery`
