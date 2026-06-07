# @git-chopstick/core

A standalone Git backend library extracted from [GitHub Desktop](https://github.com/desktop/desktop). Provides TypeScript-first wrappers around the Git CLI for repository operations.

## Features

- **60+ Git command wrappers** — status, diff, log, branch, commit, merge, rebase, stash, worktree, fetch, push, pull, cherry-pick, and more
- **Full dugite replacement** — `exec.ts` uses direct `child_process.spawn('git', ...)` instead of the dugite npm package
- **Pure CLI-based** — works with the user's installed Git, no native bindings
- **TypeScript-first** — complete type definitions for all Git models and operations
- **Zero Electron dependencies** — can be used in Node.js or Bun

## Usage

### As a local dependency

```typescript
import { Repository } from '@git-chopstick/core/src/models/repository.js'
import { getStatus } from '@git-chopstick/core/src/git/status.js'

const repo = new Repository('/path/to/repo', 1)
const status = await getStatus(repo)

console.log(`Branch: ${status.currentBranch}`)
console.log(`Changed files: ${status.workingDirectory.files.length}`)
```

Install via `file:` dependency in your `package.json`:
```json
{
  "dependencies": {
    "@git-chopstick/core": "file:../path/to/git-core"
  }
}
```

### From within this repo

```bash
npx tsx examples/get-status.ts /path/to/repo
```

## Architecture

The library is structured into three layers:

| Layer | Directory | Purpose |
|-------|-----------|---------|
| **Git commands** | `src/git/` | 61 files wrapping individual `git` subcommands — `status.ts`, `log.ts`, `diff.ts`, `branch.ts`, `merge.ts`, etc. |
| **Domain models** | `src/models/` | 19 type definition files — `Commit`, `Branch`, `Repository`, `IStatusResult`, diff types, etc. |
| **Utilities** | `src/lib/` | 25 files — diff parser, status parser, progress reporting stubs, trampoline, hooks, etc. |

### Key file: `src/git/exec.ts`

This is the core dugite replacement (~250 lines). It implements:
- `exec()` — spawns `git` via `child_process.spawn`, returns `{ stdout, stderr, exitCode }`
- `spawnGit()` — stream-based variant for long-running operations
- `GitError` enum — 50+ typed Git error codes
- `parseError()` — maps stderr output to typed errors

## Dependencies

| Package | Purpose |
|---------|---------|
| `byline` | Line-by-line stream reading |
| `ignore` | `.gitignore` pattern matching |
| `memoize-one` | Memoization for remote fetching |

## License

MIT — extracted from [GitHub Desktop](https://github.com/desktop/desktop) (MIT licensed).
