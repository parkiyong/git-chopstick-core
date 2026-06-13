# Changelog

## [0.1.6] — 2026-06-13

### Fixed
- **CHANGELOG.md included in package**: Added `CHANGELOG.md` to the `files` array in `package.json` so consumers can read release notes from the installed package.

---

## [0.1.5] — 2026-06-13

### Added
- **Progress reporting**: Real `parse()` methods on all progress parsers (Checkout, Fetch, Pull, Push, Clone). Progress callbacks now receive percentage updates during long-running operations.
- **`getCurrentBranch(path)`**: New helper in `rev-parse.ts` that returns the current branch name or `undefined` for detached HEAD.
- **Integration tests**: 10 tests covering repository type detection, branch lookup, status parsing, commit history, branch CRUD, createCommit, and non-repo error handling. Run with `npm test`.
- **Migration guide**: Added `docs/exec-to-git-migration.md` documenting the transition from `exec()` to `git()` with before/after examples.

### Changed
- **`exec()` removed from public API**: `exec()` is now an internal function used only by `core.ts`. Use `git()` instead — it's a strict superset with error handling, typed error codes, `successExitCodes`, and hook support.
- **README**: Updated architecture diagram (progress 🟢), consumption patterns (no `exec`), known limitations (progress now real, tests now exist).

### Fixed
- **RevertProgressParser**: Now returns proper `IGitOutput | null` type.

---

## [0.1.4] — 2026-06-13

### Added
- **Public exec API**: Exported `exec`, `spawnGit`, `parseError`, `parseBadConfigValueErrorInfo`, `ExecError` from the git barrel for low-level Git execution.
- **Repository.id default**: `Repository` constructor `id` parameter now defaults to `0` — no longer requires a placeholder value.
- **Consumption patterns**: Documented 4 import patterns in README: root barrel, git subpath, models only, and granular subpath imports.
- **Status section**: Added pre-1.0 status note with TypeScript 5.7+ compatibility to README.

### Changed
- **TypeScript strictness**: Enabled `noUnusedLocals` and `noUnusedParameters` in `tsconfig.json` to catch dead code. Fixed 5 newly detected unused variables.
- **prepublishOnly**: Now runs `npm run typecheck && npm run build` to prevent shipping type-broken packages.
- **README**: Removed stale "Not Published on npm" section (package is published).

### Fixed
- **Unused variables**: Fixed 5 TS6133 errors caught by new strict settings in `apply.ts`, `environment.ts`, `gitignore.ts`, `progress/revert.ts`.

---

## [0.1.3] — 2026-06-13

### Changed
- **Build pipeline**: Added `clean` script; `build` now runs `npm run clean && tsc` for deterministic fresh builds.
- **Exports**: Switched `exports` map from raw `./src/*.ts` to compiled `./dist/*.js` / `./dist/*.d.ts` with explicit directory barrel entries.
- **Package files**: Reduced npm package size to only `dist/` (removed `src/` from `files`).
- **Peer dependencies**: Moved `@types/node` and `@types/byline` from `dependencies`/`devDependencies` to optional `peerDependencies` to avoid version conflicts with consumers.
- **`.npmignore`**: Added as safety net alongside `"files": ["dist"]`.

### Fixed
- **TypeScript compilation**: Resolved 10 TS6133 errors (unused variables) across `fatal-error.ts`, `progress/`, and `status-parser.ts`.
- **Missing type declarations**: Added `@types/byline` to fix TS7016.
- **Buffer type mismatch**: Fixed TS2345 in `exec.ts` for `Buffer.concat()` compatibility with newer `@types/node`.

### Cleanup
- **Removed GitHub Desktop branding**: Renamed Desktop-branded symbols in `stash.ts` (`DesktopStashEntryMarker` → `StashEntryMarker`, etc.). Stripped 13 unused feature flags. Updated comments in 9 source files.

### Documentation
- **README**: Added Known Limitations section, full API reference table, error handling guide, updated architecture diagram.
- **Examples**: Created `examples/branch-operations.ts` and `examples/create-commit.ts`. Updated imports to use `'../src/index.js'`.
- **CHANGELOG.md**: Created with full version history since 0.1.0.

---

## [0.1.2] — 2026-06-13

### Added
- **Public API expansion**: `src/index.ts` now exports all 40+ git operations and all domain models through barrel files.
- **New barrel file**: `src/models/index.ts` with explicit type-only re-exports (handles naming conflicts like `ComputedAction` and `SubmoduleStatus`).
- **Missing git operations**: Added `add`, `cherry-pick`, `clean`, `lfs`, `merge-tree`, `reorder`, `squash`, `stage`, `stash`, `update-index`, `worktree-include` to the git barrel.
- **Documentation**: Rewrote README with full API reference, usage examples, and architecture docs.
- **Examples**: Added branch operations and commit creation examples.

### Changed
- **ESM imports**: Added `.js` extensions to all 150+ relative imports across 71 source files for full Node.js ESM compatibility.
- **Git barrel** (`src/git/index.ts`): Expanded from 35 to 46 module exports with `.js` extensions.

### Fixed
- **Runtime crash**: Fixed `localStorage.getItem('git-trace')` → `process.env.GIT_TRACE ?? '0'` in `authentication.ts` which was blocking all remote operations (push, pull, fetch, clone) in Node.js/Bun.

### Build
- **tsconfig.json**: Added `outDir: "dist"` and `rootDir: "src"` settings.
- **package.json**: Added deep import paths via `"./*"` export pattern, `types` field, and build/prepublish scripts.

---

## [0.1.1] — 2026-06-07

### Added
- Initial public release extracted from GitHub Desktop.
- Git operations: status, commit, log, branch, merge, rebase, push, pull, fetch, stash, cherry-pick, reset, diff, and more.
- Domain models: Repository, Commit, Branch, Status, Diff, StashEntry, Merge, Rebase, and more.
- Authentication support for HTTPS and SSH.
- LFS support stubs.
- Proxy resolution.
- Submodule support.

### Notes
- This is a fork of [desktop/desktop](https://github.com/desktop/desktop)'s Git backend, extracted and adapted as a standalone library.
- Several subsystems are stubbed: progress callbacks, hook interception, and the LFS trampoline environment.

---

## [0.1.0] — 2026-06-07

### Added
- Initial setup: package scaffolding, tsconfig, and project structure.
- Core Git execution layer (`git/exec.ts`, `git/core.ts`, `git/spawn.ts`).
- Authentication, proxy resolution, and environment helpers.
- MIT license.

---

[0.1.4]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.4
[0.1.3]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.3
[0.1.2]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.2
[0.1.1]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.1
[0.1.0]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.0
[0.1.6]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.6
[0.1.5]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.5
[0.1.4]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.4
[0.1.3]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.3
[0.1.2]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.2
[0.1.1]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.1
[0.1.0]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.0
[Unreleased]: https://github.com/parkiyong/git-chopstick-core/compare/v0.1.5...HEAD
