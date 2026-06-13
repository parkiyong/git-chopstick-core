import { opendir, stat } from 'fs/promises'
import { join, resolve } from 'path'
import type { Dir } from 'fs'
import { Repository } from '../models/repository.js'
import { directoryExists } from '../lib/directory-exists.js'
import { getRepositorySummary } from './rev-parse.js'
import type { RepositorySummary } from './rev-parse.js'

/**
 * Options for {@link getRepositories}.
 */
export interface GetRepositoriesOptions {
  /**
   * Maximum recursion depth. Defaults to 5.
   * Set to `-1` for unlimited depth.
   */
  readonly depth?: number

  /**
   * Directories to skip when walking the tree.
   * Defaults to `['node_modules', '.git', '.hg', '.svn', '.yarn', '.pnp']`.
   */
  readonly skipDirs?: ReadonlySet<string>

  /**
   * Whether to include bare repositories. Defaults to `false`.
   * Bare repos have no working directory and `Repository.path` will
   * point to the bare git directory.
   */
  readonly includeBare?: boolean
}

const defaultSkipDirs = new Set([
  'node_modules',
  '.git',
  '.hg',
  '.svn',
  '.yarn',
  '.pnp',
  '__pycache__',
  '.cache',
  '.next',
  '.turbo',
  'dist',
  'build',
  '.venv',
  'vendor',
  '.tox',
])

/**
 * Discover git repositories in a directory tree.
 *
 * Walks the directory tree under `rootPath`, looking for `.git` entries
 * (directories for regular repos, or files for worktrees and submodules).
 * Returns the discovered repositories as an array of `Repository` objects.
 *
 * @example
 * // Find all repos up to 3 levels deep, excluding node_modules
 * const repos = await getRepositories('/path/to/monorepo', { depth: 3 })
 * for (const repo of repos) {
 *   console.log(repo.name, repo.path)
 * }
 */
export async function getRepositories(
  rootPath: string,
  options: GetRepositoriesOptions = {}
): Promise<ReadonlyArray<Repository>> {
  const {
    depth = 5,
    skipDirs = defaultSkipDirs,
    includeBare = false,
  } = options

  if (!(await directoryExists(rootPath))) {
    return []
  }

  const resolvedRoot = resolve(rootPath)
  const repos: Repository[] = []
  const seen = new Set<string>()

  /**
   * Check if a path contains a `.git` entry, indicating a git repository.
   */
  async function hasGitDir(dirPath: string): Promise<boolean> {
    const gitPath = join(dirPath, '.git')
    try {
      const s = await stat(gitPath)
      return s.isDirectory() || s.isFile()
    } catch {
      return false
    }
  }

  /**
   * Check if a directory looks like a bare git repository.
   *
   * A bare repo has the git internals (HEAD, objects, refs) directly in
   * the directory rather than inside a `.git` subdirectory.
   *
   * This is a heuristic that checks for the essential bare-repo indicators
   * without spawning a git process (which would be too slow for large trees).
   */
  async function isBareRepo(dirPath: string): Promise<boolean> {
    try {
      const [headStat, objectsStat, refsStat] = await Promise.all([
        stat(join(dirPath, 'HEAD')),
        stat(join(dirPath, 'objects')),
        stat(join(dirPath, 'refs')),
      ])
      return headStat.isFile() && objectsStat.isDirectory() && refsStat.isDirectory()
    } catch {
      return false
    }
  }

  /**
   * Recursively walk a directory tree looking for repos.
   */
  async function walk(currentPath: string, currentDepth: number): Promise<void> {
    // Check depth limit
    if (depth !== -1 && currentDepth > depth) {
      return
    }

    // Resolve to avoid duplicate entries from symlinks
    const resolved = resolve(currentPath)

    // Skip if already seen (e.g., symlink loop)
    if (seen.has(resolved)) {
      return
    }
    seen.add(resolved)

    // Check if this directory is itself a regular repo (has .git directory/file)
    if (await hasGitDir(resolved)) {
      repos.push(new Repository(resolved, repos.length))
      // Continue recursing — the parent repo may contain nested repos
      // (e.g. monorepo workspaces where the root is a repo AND packages
      //  have their own .git directories)
    } else if (includeBare && (await isBareRepo(resolved))) {
      repos.push(new Repository(resolved, repos.length))
      // Don't recurse into bare repos — the subdirectories are git internals
      // (objects/, refs/, etc.) and not the working tree
      return
    }

    // Recurse into subdirectories
    let dir: Dir
    try {
      dir = await opendir(resolved)
    } catch {
      return // Permission denied, etc.
    }

    for await (const entry of dir) {
      if (entry.name.startsWith('.')) {
        // Skip hidden directories (except the root itself)
        // But .gitignore, .github, etc. could have submodules
        // Only skip .git, .hg, .svn
        if (entry.name === '.git' || entry.name === '.hg' || entry.name === '.svn') {
          continue
        }
      }

      if (skipDirs.has(entry.name)) {
        continue
      }

      if (entry.isDirectory()) {
        await walk(join(resolved, entry.name), currentDepth + 1)
      } else if (entry.isSymbolicLink()) {
        // Follow symlinks to directories
        const linkPath = join(resolved, entry.name)
        try {
          const linkStat = await stat(linkPath)
          if (linkStat.isDirectory()) {
            await walk(linkPath, currentDepth + 1)
          }
        } catch {
          // Broken symlink, skip
        }
      }
    }
  }

  await walk(resolvedRoot, 0)
  return repos
}

/**
 * Discover git repositories in a directory tree and return a summary
 * for each one.
 *
 * Combines {@link getRepositories} and {@link getRepositorySummary} into
 * a single call — useful for getting an instant overview of a monorepo
 * workspace without iterating over results manually.
 *
 * Repositories that fail to produce a summary (bare repos, detached HEAD
 * with no commits, etc.) are silently omitted from the result.
 *
 * @example
 * const summaries = await getRepositoriesSummary('/path/to/monorepo')
 * for (const s of summaries) {
 *   console.log(`${s.path}: ${s.currentBranch ?? '(detached)'} @ ${s.head.slice(0, 7)}`)
 * }
 */
export async function getRepositoriesSummary(
  rootPath: string,
  options: GetRepositoriesOptions = {}
): Promise<ReadonlyArray<RepositorySummary>> {
  const repos = await getRepositories(rootPath, options)

  const results = await Promise.allSettled(
    repos.map(r => getRepositorySummary(r.path))
  )

  const summaries: RepositorySummary[] = []
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value !== null) {
      summaries.push(result.value)
    }
  }

  return summaries
}
