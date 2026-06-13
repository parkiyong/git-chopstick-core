---
name: release
description: Automated release workflow for git-chopstick-core — version bump, changelog, build, validation, and npm publish.
---

# Release: git-chopstick-core

> Loaded via `skill("release")`. Run this whenever you need to publish a new release.

## Process

### 1. Read current state

Read `package.json`, `CHANGELOG.md`, and run `git log --oneline -5` to understand what has changed since the last release.

### 2. Determine version bump

Check what has changed:

- **Breaking API changes** (removed exports, changed signatures) → minor bump (0.x.0)
- **New features** (new functions, new exports) → patch bump (0.0.x)
- **Bug fixes, docs, internal refactoring** → patch bump (0.0.x)

Current version: read from `package.json`. Bump accordingly.

### 3. Update `CHANGELOG.md`

Insert a new `## [VERSION] — YYYY-MM-DD` section at the top (below the `# Changelog` heading) with:

- `### Added` — new features, exports, helpers
- `### Changed` — behavioral changes, renames, config changes
- `### Fixed` — bug fixes

Then update the link references at the bottom:

- Add `[VERSION]: https://github.com/parkiyong/git-chopstick-core/releases/tag/vVERSION`
- Update `[Unreleased]: .../compare/vVERSION...HEAD`

### 4. Bump `package.json`

Update `"version"` field.

### 5. Build and validate

Run all of these (use parallel agents):

- `npm run typecheck` — must pass with zero errors
- `npm run build` — must produce a clean `dist/`
- `npm test` — all integration tests must pass
- `npm pack --dry-run` — confirm `dist/` is included (expect ~351 files, ~700kB)

If any fail, fix before proceeding.

### 6. Stage and commit

```
git add -A
git commit -m "vVERSION: <short summary of changes>"
```

### 7. Push and publish

```
git push origin main
npm publish
```

### 8. Verify

- Confirm npm shows the new version: `npm view git-chopstick-core version`
- Confirm the tag exists on GitHub: `git tag -l`
- Suggest followup tasks

## Notes

- `prepublishOnly` runs `npm run typecheck && npm run build` automatically, so no need to build before publish — but validate first anyway.
- If this is the first release in a session, run `setup-matt-pocock-skills` first to configure issue tracker context.
