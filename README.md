# git-chopstick-core

A standalone Git backend library extracted from [GitHub Desktop](https://github.com/desktop/desktop). Provides TypeScript-first wrappers around the Git CLI for repository operations — no native bindings, no Electron dependencies, just `child_process.spawn('git', ...)`.

## Features

- **45+ Git command wrappers** — every major operation: status, diff, log, branch (CRUD), commit, merge, rebase, stash, worktree, fetch, push, pull, cherry-pick, revert, tag, clone, init, clean, config, submodule, LFS, and more
- **Full dugite replacement** — direct `child_process.spawn('git', ...)` with 50+ typed error codes
- **Pure CLI-based** — works with the user's installed Git, no native bindings
- **TypeScript-first** — complete type definitions for all models and operations (`strict: true`)
- **Zero Electron dependencies** — works in Node.js ≥18 or Bun
- **Barrel exports** — import everything from a single entry point

## Installation

```bash
npm install git-chopstick-core
# or via file path for local development:
npm install file:../path/to/git-chopstick-core
```

> **Note:** Published on npm as `git-chopstick-core`. Use a `file:` dependency for local development.

## Quick Start

```typescript
import { Repository, getStatus, GitError } from 'git-chopstick-core'

const repo = new Repository('/path/to/repo', 1)

try {
  const status = await getStatus(repo)
  console.log(`🌿 ${status.currentBranch}`)
  console.log(`📝 ${status.workingDirectory.files.length} changed files`)
} catch (e) {
  if (e instanceof GitError) {
    console.error(`Git error: ${e.message}`)
  }
}
```

## Usage Examples

### Repository Status

```typescript
import { Repository, getStatus } from 'git-chopstick-core'

const repo = new Repository('/path/to/repo', 1)
const status = await getStatus(repo)

if (!status) {
  console.log('Not a git repository')
  process.exit(1)
}

console.log(`Branch: ${status.currentBranch ?? '(detached)'}`)
console.log(`Upstream: ${status.currentUpstreamBranch ?? 'none'}`)

if (status.branchAheadBehind) {
  console.log(`Ahead: ${status.branchAheadBehind.ahead}`)
  console.log(`Behind: ${status.branchAheadBehind.behind}`)
}

// Working directory changes
for (const file of status.workingDirectory.files) {
  console.log(`${file.status.kind}: ${file.path}`)
}

// Conflict detection
if (status.doConflictedFilesExist) {
  console.log('⚠️  Merge conflicts detected')
}
if (status.rebaseInternalState) {
  console.log(`🔄 Rebase onto ${status.rebaseInternalState.targetBranch}`)
}
```

### Create a Commit

```typescript
import { Repository, getStatus, createCommit } from 'git-chopstick-core'

const repo = new Repository('/path/to/repo', 1)
const status = await getStatus(repo)

// Stage and commit all tracked files
const files = status!.workingDirectory.files
const sha = await createCommit(repo, 'feat: add new feature', files)
console.log(`Committed: ${sha}`)
```

### Branch Operations

```typescript
import {
  Repository, Branch, BranchType, createBranch,
  deleteLocalBranch, renameBranch, getBranches
} from 'git-chopstick-core'

const repo = new Repository('/path/to/repo', 1)

// Create a branch
await createBranch(repo, 'feature/new-feature', 'main')

// List all branches
const branches = await getBranches(repo)
for (const branch of branches) {
  const icon = branch.type === BranchType.Local ? '🌿' : '🌐'
  console.log(`${icon} ${branch.name}`)
}

// Rename
await renameBranch(repo, branches[0], 'feature/renamed')

// Delete
await deleteLocalBranch(repo, 'feature/old-branch')
```

### Merge

```typescript
import {
  Repository, merge, MergeResult,
  abortMerge, getMergeBase, isMergeHeadSet
} from 'git-chopstick-core'

const repo = new Repository('/path/to/repo', 1)

const result = await merge(repo, 'feature/new-feature')

switch (result) {
  case MergeResult.Success:
    console.log('✓ Merge successful')
    break
  case MergeResult.AlreadyUpToDate:
    console.log('✓ Already up to date')
    break
  case MergeResult.Failed:
    console.log('✗ Merge failed — resolve conflicts')
    break
}
```

### Push & Pull

```typescript
import {
  Repository, push, pull, getRemotes, getStatus
} from 'git-chopstick-core'

const repo = new Repository('/path/to/repo', 1)
const [remote] = await getRemotes(repo)
const status = await getStatus(repo)

// Push current branch
await push(repo, remote, status!.currentBranch!, null, null)

// Pull from remote
await pull(repo, remote)
```

### Error Handling

```typescript
import {
  Repository, merge, GitError, GitErrorCodes
} from 'git-chopstick-core'

const repo = new Repository('/path/to/repo', 1)

try {
  await merge(repo, 'other-branch')
} catch (e) {
  if (e instanceof GitError) {
    // e.result.gitError is the error code enum
    switch (e.result.gitError) {
      case GitErrorCodes.MergeConflicts:
        console.error('Conflicts need resolution')
        break
      case GitErrorCodes.RebaseConflicts:
        console.error('Rebase conflicts')
        break
      case GitErrorCodes.PushNotFastForward:
        console.error('Push rejected — pull first')
        break
      case GitErrorCodes.HTTPSAuthenticationFailed:
      case GitErrorCodes.SSHAuthenticationFailed:
        console.error('Authentication failed')
        break
      default:
        console.error(`Git error: ${e.result.gitErrorDescription}`)
    }
  }
}
```

## API Reference

### Git Operations (`src/git/`)

| Module | Key Exports | Description |
|--------|-------------|-------------|
| `add` | `addConflictedFile` | Stage a resolved conflicted file |
| `apply` | `applyPatchToIndex`, `checkPatch`, `discardChangesFromSelection` | Apply patches to the index |
| `branch` | `createBranch`, `renameBranch`, `deleteLocalBranch`, `deleteRemoteBranch`, `getBranchNames`, `getBranchesPointedAt`, `getMergedBranches` | Branch CRUD |
| `checkout` | `checkoutBranch`, `checkoutCommit`, `checkoutPaths`, `checkoutConflictedFile` | Checkout branches/commits/files |
| `checkout-index` | `checkoutIndex` | Checkout files from the index |
| `cherry-pick` | `cherryPick`, `continueCherryPick`, `abortCherryPick`, `getCherryPickSnapshot` | Cherry-pick commits |
| `clean` | `cleanUntrackedFiles` | Remove untracked files |
| `clone` | `clone` | Clone a repository |
| `commit` | `createCommit`, `createMergeCommit` | Create commits |
| `config` | `getConfigValue`, `getGlobalConfigValue`, `getBooleanConfigValue` | Read git config |
| `diff` | `getWorkingDirectoryDiff`, `getCommitDiff`, `getBranchMergeBaseDiff`, `getCommitRangeDiff`, `getBinaryPaths` | Diff rendering |
| `diff-index` | `getIndexChanges` | Compare index with tree |
| `fetch` | `fetch`, `fetchRefspec`, `fastForwardBranches` | Fetch from remotes |
| `for-each-ref` | `getBranches`, `getBranchesDifferingFromUpstream` | List refs |
| `format-patch` | `formatPatch` | Generate patch files |
| `gitignore` | `readGitIgnoreAtRoot`, `saveGitIgnore`, `appendIgnoreRule`, `escapeGitSpecialCharacters` | Manage .gitignore |
| `init` | `initGitRepository` | Initialize a repo |
| `interpret-trailers` | `parseRawUnfoldedTrailers`, `isCoAuthoredByTrailer`, `getTrailerSeparatorCharacters` | Git trailer parsing |
| `lfs` | `installGlobalLFSFilters`, `isUsingLFS`, `isTrackedByLFS`, `filesNotTrackedByLFS` | Git LFS support |
| `log` | `getCommits`, `getCommit`, `getChangedFiles`, `getAuthors` | Commit history |
| `merge` | `merge`, `getMergeBase`, `abortMerge` | Merge branches |
| `merge-tree` | `determineMergeability` | Test mergeability without merging |
| `pull` | `pull` | Pull from remote |
| `push` | `push` | Push to remote |
| `rebase` | `rebase`, `continueRebase`, `abortRebase`, `rebaseInteractive`, `getRebaseInternalState`, `getRebaseSnapshot` | Rebase operations |
| `reflog` | `getRecentBranches`, `getBranchCheckouts` | Reflog inspection |
| `refs` | `formatAsLocalRef`, `getSymbolicRef` | Ref manipulation |
| `remote` | `getRemotes`, `addRemote`, `removeRemote` | Remote management |
| `reorder` | `reorder` | Interactive rebase reordering |
| `reset` | `reset`, `resetPaths`, `unstageAll` | Reset operations |
| `revert` | `revertCommit` | Revert a commit |
| `rev-list` | `getAheadBehind`, `getBranchAheadBehind`, `revRange`, `revSymmetricDifference` | Commit range queries |
| `rev-parse` | `getRepositoryType`, `getCurrentBranch`, `getUpstreamRefForRef`, `getCurrentUpstreamRef` | Rev parsing / branch detection |
| `rm` | `removeConflictedFile` | Remove files |
| `squash` | `squash` | Interactive rebase squashing |
| `stage` | `stageManualConflictResolution`, `stageResolvedConflictFiles` | Stage conflict resolutions |
| `stash` | `getStashes`, `createStashEntry`, `popStashEntry`, `getStashedFiles`, `dropStashEntry` | Stash management |
| `status` | `getStatus` | Repository status |
| `submodule` | `updateSubmodulesAfterOperation`, `listSubmodules`, `resetSubmodulePaths` | Submodule operations |
| `tag` | `createTag`, `deleteTag`, `getAllTags` | Tag management |
| `update-index` | `stageFiles` | Stage files |
| `update-ref` | `updateRef`, `deleteRef` | Ref updates |
| `var` | `getAuthorIdentity` | Git var queries |
| `worktree` | `listWorktrees`, `addWorktree`, `removeWorktree`, `pruneWorktrees`, `getWorktreeCheckedOutBranches` | Worktree management |
| `worktree-include` | `addWorktreeWithIncludes`, `readWorktreeIncludePatterns` | Worktree with file includes |

### Domain Models (`src/models/`)

| Export | Type | Description |
|--------|------|-------------|
| `Repository` | class | Represents a git repository |
| `Commit` | class | A single commit (sha, summary, body, author, etc.) |
| `CommitIdentity` | class | Author/committer identity |
| `Branch` | class | Branch with upstream tracking info |
| `BranchType` | enum | `Local` or `Remote` |
| `AppFileStatusKind` | enum | `New`, `Modified`, `Deleted`, `Renamed`, `Copied`, `Conflicted`, `Untracked` |
| `FileChange` | class | Base file change model |
| `WorkingDirectoryFileChange` | class | Uncommitted file change with diff selection |
| `CommittedFileChange` | class | File change from a commit |
| `WorkingDirectoryStatus` | class | Container for working directory changes |
| `DiffSelection` / `DiffSelectionType` | class/enum | Partial file staging |
| `ComputedAction` | enum | `Clean`, `Conflicts`, `Invalid`, `Loading` |
| `ManualConflictResolution` | enum | `theirs` / `ours` |
| `MergeResult` / `RebaseResult` / `CherryPickResult` | enum | Operation outcomes |

### Core Types

| Export | Description |
|--------|-------------|
| `GitError` (class) | Thrown when a git command fails — catch this |
| `GitErrorCodes` (enum) | Error code constants — `MergeConflicts`, `PushNotFastForward`, `SSHAuthenticationFailed`, etc. (50+ codes) |
| `IGitResult` | Full command result with `gitError`, `gitErrorDescription`, `path` |
| `IGitExecutionOptions` | Options for `git()` function |

## Known Limitations

This library is extracted directly from [GitHub Desktop](https://github.com/desktop/desktop), a mature Electron application. Some subsystems that depend on GitHub Desktop's specific runtime environment have been extracted as **stubs** — they compile and type-check correctly but don't provide real functionality:

### 🟢 Progress Reporting (`src/lib/progress/`)

The progress parsers (`CheckoutProgressParser`, `FetchProgressParser`, `PullProgressParser`, `PushProgressParser`, `CloneProgressParser`, `RevertProgressParser`) now have real `parse()` methods that extract percentage and description from git's stderr output. Progress callbacks receive updates for clone, fetch, push, pull, and checkout operations.

Note: `git revert` does not produce progress output, so `RevertProgressParser` still returns `null` from its `parse()` method — this is correct behavior.

### 🟡 Git Hook Interception (`src/lib/hooks/`)

`withHooksEnv` is a **stub** that calls through without configuring any hook environment. The `interceptHooks` option for `git()` and operation functions (e.g., `createCommit`, `push`, `pull`) will **not fire** `onHookProgress` or `onHookFailure` callbacks. Git hooks will still run normally on their own — the library just can't intercept them.

### 🟡 Git LFS Trampoline (`src/lib/trampoline/`)

`withTrampolineEnv` is a **stub** that calls through without setting up the Git LFS trampoline environment. Git LFS operations may not work correctly as a result.

### 🟢 Integration Tests

Integration tests are available in `src/__tests__/integration.test.ts` and run against real git repositories in temp directories. Run `npm test` to execute them.

---

## Architecture

```
src/
├── index.ts           ← Public API entry (barrel)
├── git/               ← 46 files: one per git subcommand
│   ├── exec.ts        ← Core dugite replacement: spawns git, parses errors
│   ├── core.ts        ← Higher-level git() wrapper with hooks, progress, env
│   └── index.ts       ← Git barrel (re-exports all git modules)
├── models/            ← 17+ files: domain types
│   ├── repository.ts
│   ├── commit.ts
│   ├── status.ts
│   ├── diff/          ← Diff types (DiffLine, DiffHunk, IDiff, IRawDiff, etc.)
│   └── index.ts       ← Models barrel
└── lib/               ← Utilities: parsers, progress reporting, hooks, fs helpers
    ├── diff-parser.ts  ← Full diff parser (text/binary/image)
    ├── status-parser.ts ← Porcelain v2 status parser
    ├── progress/       ← 🟢 Progress parsers (real — see Known Limitations)
    ├── hooks/          ← 🟡 Git hook env (stubbed — see Known Limitations)
    └── trampoline/     ← 🟡 Git LFS trampoline (stubbed — see Known Limitations)
```

## Development

```bash
# Type-check
npm run typecheck

# Build (compile TypeScript → dist/)
npm run build

# Clean rebuild (build already cleans automatically)
npm run build

# Run examples (uses tsx for source-level execution)
npx tsx examples/get-status.ts /path/to/repo
npx tsx examples/branch-operations.ts /path/to/repo
npx tsx examples/create-commit.ts /path/to/repo
```

## Status

> **Pre-1.0** — The public API (`exports` map, barrel exports, error types) is stabilizing but may see minor breaking changes before 1.0. See [CHANGELOG.md](./CHANGELOG.md) for version history. Tested with TypeScript 5.7+.

## Consumption Patterns

> Upgrading from v0.1.4? See the [exec → git() migration guide](./docs/exec-to-git-migration.md) if you were using `exec()` from the public API.

### Root barrel (recommended for most use cases)

```typescript
// All 45+ git operations, domain models, error types
import { Repository, getStatus, createCommit, getBranches, merge, GitError, GitErrorCodes } from 'git-chopstick-core'
```

### Git subpath (low-level access)

```typescript
// Low-level helpers (parse git errors, spawn streaming git processes)
import { parseError, spawnGit } from 'git-chopstick-core/git'

// Use git() from the root barrel for most operations
import { git } from 'git-chopstick-core'

const result = await git(['rev-parse', '--show-toplevel'], '/path/to/repo', 'my-op')
console.log(result.stdout)
```

### Models only

```typescript
import { Commit, Branch, BranchType, AppFileStatusKind } from 'git-chopstick-core'
```

### Granular (for bundle size)

```typescript
import { getCommits } from 'git-chopstick-core/git/log'
import { getBranches } from 'git-chopstick-core/git/for-each-ref'
```

### Consumption Notes

- **Compiled consumption** (recommended): Import from `'git-chopstick-core'` — the `exports` field in `package.json` points to the compiled output in `dist/`. Works with Node.js ESM and bundlers alike.
- **Run examples**: After building, use `npx tsx` to execute the examples: `npx tsx examples/get-status.ts /path/to/repo`.

## Dependencies

| Package | Purpose |
|---------|---------|
| `byline` | Line-by-line stream reading |
| `ignore` | `.gitignore` pattern matching |
| `memoize-one` | Memoization for remote fetching |

## License

MIT — extracted from [GitHub Desktop](https://github.com/desktop/desktop) (MIT licensed).
