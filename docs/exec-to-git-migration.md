# Migration Guide: `exec` → `git()`

> **Applies to:** Upgrading from `git-chopstick-core@0.1.4` to `0.1.5+`

In v0.1.4, `exec()` was briefly exposed as a public function. Starting in **v0.1.5**, `exec()` is no longer part of the public API — `git()` is the single function for running Git commands.

## Why?

`exec()` and `git()` did the same thing with different semantics:

| Aspect | `exec()` | `git()` |
|--------|----------|---------|
| `successExitCodes` | ❌ No — raw exit code | ✅ Yes — configurable set |
| Error parsing | ❌ No | ✅ Yes — 50-code `GitError` enum |
| Throws on bad exit | ❌ No — returns raw result | ✅ Yes — throws `GitError` |
| Hook interception | ❌ No | ✅ Yes — `interceptHooks` option |
| Buffer output | ✅ Yes — `encoding: 'buffer'` | ✅ Yes — `{ encoding: 'buffer' }` |

`git()` does everything `exec()` did, plus error handling, typed error codes, and hook support. Maintaining both was confusing.

## Before → After

### Raw git execution (basic)

```typescript
// Before (v0.1.4)
import { exec } from 'git-chopstick-core/git'
const result = await exec(['rev-parse', '--show-toplevel'], '/path/to/repo')

// After (v0.1.5+)
import { git } from 'git-chopstick-core'
const result = await git(['rev-parse', '--show-toplevel'], '/path/to/repo', 'my-op')
```

### Buffer output (binary diffs)

```typescript
// Before
import { exec } from 'git-chopstick-core/git'
const result = await exec(['diff', '--binary', sha], path, { encoding: 'buffer' })

// After
import { git } from 'git-chopstick-core'
const result = await git(['diff', '--binary', sha], path, 'my-op', { encoding: 'buffer' })
```

### Ignoring non-zero exit codes

```typescript
// Before — exec doesn't filter, so you check exitCode manually
const result = await exec(['symbolic-ref', '--short', 'HEAD'], path)
const branch = result.exitCode === 0 ? result.stdout.toString().trim() : undefined

// After — git() accepts successExitCodes, returns result or throws
const result = await git(['symbolic-ref', '--short', 'HEAD'], path, 'getBranch', {
  successExitCodes: new Set([0, 128]),
})
const branch = result.exitCode === 0 ? result.stdout.trim() : undefined

// Or just use the built-in helper:
import { getCurrentBranch } from 'git-chopstick-core'
const branch = await getCurrentBranch(path)
```

## What stayed public?

The following from `exec.ts` remain in the public API because they serve different purposes:

| Export | Purpose |
|--------|---------|
| `spawnGit(args, path, options?)` | Returns a `ChildProcess` for streaming git access — useful for long-running operations where you want direct process control |
| `parseError(stderr)` | Parse git stderr into a `GitError` enum value for manual error inspection |
| `parseBadConfigValueErrorInfo(stderr)` | Extract key/value from bad config value errors |
| `ExecError` (class) | Error thrown when maxBuffer is exceeded |
| `GitError` (enum) | 50+ typed error codes (available as `GitErrorCodes` from root barrel) |
