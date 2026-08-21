# Release Runbook

Release-it is the only permitted release and production deployment path. It owns the version bump, changelog, release commit, tag, push, GitHub Release, and Vercel deployment as one workflow. Do not reproduce those steps manually.

## Preconditions

Before requesting or running a release:

1. Ensure the worktree is clean and all release-relevant changes are committed.
2. Check that the current branch and remote state are correct and up to date.
3. Confirm the required GitHub and Vercel credentials are available without printing them. The Vercel CLI reads `VERCEL_TOKEN` from the environment; never pass `--token` or any credential in CLI arguments.
4. Obtain explicit user authorization for the release and its SemVer increment.

Normal development rules still require scoped tests and separate approval before a full suite or build. **Release exception:** authorization for a specific release command includes its mandatory full test suite and build. Do not request separate approval for those hooks, and do not skip or bypass them. This exception applies only to that authorized release attempt.

If unrelated work makes the worktree dirty, never stash, revert, or commit another user's changes. Prepare the release from a clean temporary clone or worktree instead, using the same local release-it command and hooks.

## Version Decision

Choose the increment from the release commits:

- `fix` → patch
- `feat` → minor
- breaking change → major

If the user did not specify an increment, inspect the commits, recommend the appropriate increment, and ask one concise patch/minor/major question. Once answered, run the matching command without proposing manual alternatives.

## One True Command

Agents must use the local npm script in non-interactive mode:

```bash
# Patch
npm run release:patch -- --ci

# Minor
npm run release:minor -- --ci

# Major
npm run release:major -- --ci
```

Do not use the interactive `npm run release`.

## Automated Gates and Artifacts

The release-it `before:init` hooks run sequentially:

1. `npm run lint`
2. `npm run test:run`
3. `npm run build`

Any failure aborts before release artifacts are created. Never disable a hook with release-it flags or configuration overrides.

After all gates pass, release-it performs the complete release:

1. Bumps the package version.
2. Updates `CHANGELOG.md` from conventional commits.
3. Creates `chore: release v${version}`.
4. Creates the `v${version}` tag.
5. Pushes the release commit and tag.
6. Creates the GitHub Release.
7. Runs `vercel deploy --prod --yes --force --with-cache` from `after:release`.

Vercel Git integration can register and cancel a deployment for the same commit SHA before the tagged release hook runs. `--force` creates a fresh production deployment for that SHA, while `--with-cache` retains the build cache.

In `vercel.json`, `ignoreCommand` allows Git-triggered builds only for an exact tagged `HEAD`: exit `1` means proceed when `HEAD` has an exact tag; exit `0` means cancel all other non-release Git builds. The release-it hook remains the authoritative deployment path.

## Verification

A successful deploy hook alone is insufficient. Verify all of the following:

- release-it exited successfully;
- the release tag exists locally and on the remote;
- the matching GitHub Release exists;
- the Vercel production deployment status is `Ready`.

Read-only checks such as `gh release view`, `vercel ls --prod`, and `vercel inspect` are allowed. They are verification commands, not substitutes for the release-it deployment hook.

## Failure Recovery

### Gate failure

If lint, the full test suite, or the build fails, fix the error, verify the fix, commit it, and rerun the same release-it command. Because the failure occurred in `before:init`, no release tag or GitHub Release should exist.

### Failure after publication

If failure occurs after the tag or GitHub Release was published, never delete or rewrite the published tag, amend published history, or reuse that version. Fix the issue on `main`, commit it, and publish the next patch with release-it.

Never recover with a standalone deployment. Diagnose and fix the release configuration, then rerun deployment through release-it as part of the next patch release.

## Prohibited Manual Paths

During a release, never:

- edit the package version manually or run `npm version`;
- generate or hand-edit the release changelog as a substitute for the plugin;
- manually create or amend the release commit;
- manually create or push a tag;
- run `gh release create`;
- run a standalone `vercel deploy`;
- bypass hooks with release-it flags or configuration overrides;
- pass tokens or other credentials in CLI arguments.
