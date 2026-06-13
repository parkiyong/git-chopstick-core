# Changelog

## [0.1.15] — 2026-06-13

### Added
- **`includeBare` option for `getRepositories`**: Bare repository detection is now implemented. Uses a heuristic check (`HEAD` + `objects/` + `refs/` via `stat`) to detect bare repos without spawning git processes. Bare repos are added to results but their internal directories (`objects/`, `refs/`, etc.) are not traversed.
- **`getRepositoriesSummary(rootPath, options?)`**: Combines `getRepositories` + `getRepositorySummary` for an instant workspace overview. Silently omits bare repos and unborn HEADs from results.
- **Integration tests**: 4 new tests covering `getRepositoriesSummary` (2) and `includeBare` (2). Total: 60 tests.

---

## [0.1.13] — 2026-06-13

### Added
- **`getRepositories(rootPath, options?)`**: New `src/git/discover.ts` module for discovering git repos in a directory tree. Walks directories using `fs.opendir` with depth control (default 5), skips `node_modules`/`.git`/`.yarn`/etc., handles symlinks and worktree `.git` files. Returns `Repository[]`.
- **`WorkingDirectoryFileChangeSummary`** type: Like `WorkingDirectoryChangeSummary` but includes `selectionType` and `selection` for staging decisions.
- **`getWorkingDirectoryChangesDetailed(repository)`**: Selection-aware variant of `getWorkingDirectoryChanges` that returns `WorkingDirectoryFileChangeSummary[]` with `DiffSelection` objects.
- **`fileChangeSummaryToWorkingDirectoryFile(summary)`**: Lossy roundtrip helper to convert a `WorkingDirectoryFileChangeSummary` back to `WorkingDirectoryFileChange` for use with `stageFiles()`.
- **Integration tests**: 8 new tests covering `getWorkingDirectoryChangesDetailed` (3), `fileChangeSummaryToWorkingDirectoryFile` roundtrip (2), and `getRepositories` (5). Total: 56 tests.

### Changed
- **README Known Limitations**: Removed stale "Integration Tests" item from Known Limitations section (not a limitation). Cleaned up section.
- **README API reference**: Added `discover` module, `getWorkingDirectoryChangesDetailed`, `fileChangeSummaryToWorkingDirectoryFile`, `WorkingDirectoryChangeSummary`, and `WorkingDirectoryFileChangeSummary` to tables.
- **`src/git/index.ts`**: Added `discover.js` to barrel exports.
- **`src/git/status.ts`**: Re-exports `DiffSelectionType` and `DiffSelection` at module level for convenient imports.

---

## [0.1.11] — 2026-06-13

### Added
- **`getTags(path)`**: New path-based helper in `tag.ts` returning `ReadonlyArray<TagEntry>` (`{name, sha}[]`). Uses `git show-ref --tags -d` with annotated-tag normalization. Returns `[]` for tag-less repos and non-repo paths.
- **`getStashesByPath(path)`**: Path-based stash listing in `stash.ts`. `getStashes(repository)` delegates to it internally. `StashResult` type now exported.
- **`getFileAtCommit(repoPath, sha, file)`**: New helper in `show.ts` returning file content as `string` via `git show ${sha}:${file}`. Throws with descriptive message for non-existent files.
- **`appFileStatusToString(status)`**: New helper in `models/status.ts` converting `AppFileStatus` to human-readable strings (Added, Modified, Deleted, Renamed, Copied, Conflicted, Untracked).
- **`getChangedFilesFlat(repository, sha)`**: New helper in `log.ts` returning `ReadonlyArray<FlatFileChange>` (`{path, statusKind, oldPath?}`). Wraps `getChangedFiles` and flattens the `CommittedFileChange.status` union.
- **`examples/commit-file-browser.ts`**: CLI demo walking through the "Browse file tree at any commit" feature using `getFileAtCommit`, `getChangedFilesFlat`, and `getCommits`.
- **Integration tests**: 14 new tests covering `getTags` (3), `getFileAtCommit` (4), `getChangedFilesFlat` (3), `getStashesByPath` (3), and `appFileStatusToString` (1). Total: 45 tests.

### Fixed
- **`show.js` missing from git barrel**: `src/git/index.ts` now exports `show.js`, making `getFileAtCommit` (and `getBlobContents`/`getPartialBlobContents`) available through the root barrel.
- **`getTags` exit code 128**: Non-repo paths now return `[]` instead of throwing, by adding exit code 128 to `successExitCodes`.

### Changed
- **README**: Updated API reference for `tag.ts`, `stash.ts`, `show.ts`, `log.ts`, and domain models table.

---

## [0.1.10] — 2026-06-13

### Added
- **`getRepositorySummary(path)`**: New helper combining `getRepositoryType` + `git rev-parse HEAD` + `getCurrentBranch` into one call. Returns `{ path, head, currentBranch? }` or `null` for bare/missing repos.
- **`getRemoteUrl(path, name)`**: Path-based helper using `git config --get remote.<name>.url`. `getRemoteURL(repository, name)` now delegates to it.
- **`spawnGit` progress example**: `examples/spawn-git-progress.ts` demonstrating how to wire `spawnGit` to `CheckoutProgressParser`, `FetchProgressParser`, `PushProgressParser`, `PullProgressParser`, and `CloneProgressParser`.
- **Integration tests**: 18 new tests covering `getRepositorySummary` (5), `getRemoteUrl` (3), `getRemotesFromPath` (2), `addRemote`/`removeRemote`/`setRemoteURL` (4), `merge` (2), `rebase` (1), and `stash` (1). Total: 31 tests.

### Changed
- **README**: Updated API reference with `getRepositorySummary` and `getRemoteUrl`/`getRemoteURL` exports.

---

## [0.1.9] — 2026-06-13

### Added
- **Test fixtures**: Created `src/__tests__/fixtures/test-repo.bundle` — a pre-built git bundle with 6 commits, 3 branches, and 1 tag for faster test setup. Added `src/__tests__/fixture-helpers.ts` with `setupFixtureRepo()` to clone the bundle in ~10ms instead of building a repo from scratch. Refactored integration tests to use the fixture.
- **Release skill moved**: Moved from `docs/skills/release.md` to `.agents/skills/release-npm.md` and renamed to `release-npm`.
- **Global default branch**: Set `git config --global init.defaultBranch main`.

### Changed
- **Fixture rebuild instructions**: Updated to use `git init -q` (relies on global `init.defaultBranch`).
- **`prepublishOnly` now runs tests**: Integration tests run during `npm publish` to catch regressions before they ship.

---

## [0.1.8] — 2026-06-13

### Added
- **Test files included in package**: Added `src/__tests__/` to the `files` array in `package.json`. Integration tests ship with the installed package so consumers can run `npm test` to verify the package works for their environment.

---

## [0.1.7] — 2026-06-13

### Added
- **Documentation included in package**: Added `docs/` to the `files` array in `package.json`. The migration guide (`docs/exec-to-git-migration.md`) and release skill (`docs/skills/release.md`) now ship with the installed package.

---

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

[0.1.15]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.15
[0.1.13]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.13
[0.1.11]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.11
[0.1.10]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.10
[0.1.9]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.9
[0.1.8]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.8
[0.1.7]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.7
[0.1.6]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.6
[0.1.5]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.5
[0.1.4]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.4
[0.1.3]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.3
[0.1.2]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.2
[0.1.1]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.1
[0.1.0]: https://github.com/parkiyong/git-chopstick-core/releases/tag/v0.1.0
[Unreleased]: https://github.com/parkiyong/git-chopstick-core/compare/v0.1.15...HEAD
