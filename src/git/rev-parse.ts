import { git } from './core.js'
import { directoryExists } from '../lib/directory-exists.js'
import { resolve } from 'path'

export type RepositoryType =
  | { kind: 'bare' }
  | { kind: 'regular'; topLevelWorkingDirectory: string; gitDir: string }
  | { kind: 'missing' }
  | { kind: 'unsafe'; path: string }

/**
 * Attempts to fulfill the work of isGitRepository and isBareRepository while
 * requiring only one Git process to be spawned.
 *
 * Returns 'bare', 'regular', or 'missing' if the repository couldn't be
 * found.
 */
export async function getRepositoryType(path: string): Promise<RepositoryType> {
  if (!(await directoryExists(path))) {
    return { kind: 'missing' }
  }

  try {
    const result = await git(
      ['rev-parse', '--is-bare-repository', '--show-cdup', '--git-dir'],
      path,
      'getRepositoryType',
      { successExitCodes: new Set([0, 128]) }
    )

    if (result.exitCode === 0) {
      // Bare repositories will not include gitdir so we handle that separately
      if (result.stdout.startsWith('true\n')) {
        return { kind: 'bare' }
      }

      // --is-bare-repository and --show-cdup each produce a single line but
      // --git-dir could theoretically contain newlines so we parse the known
      // fields first and treat the remainder as the git dir. We use [\s\S]*
      // instead of .* for the git dir capture group because .* doesn't match
      // newlines whereas [\s\S]* matches any character including newlines.
      const match = result.stdout.match(/^(true|false)\n(.*)\n([\s\S]*)\n$/)

      if (match) {
        const [, isBare, cdup, gitDir] = match

        return isBare === 'true'
          ? { kind: 'bare' }
          : {
              kind: 'regular',
              topLevelWorkingDirectory: resolve(path, cdup),
              gitDir: resolve(path, gitDir),
            }
      }
    }

    const unsafeMatch =
      /fatal: detected dubious ownership in repository at '(.+)'/.exec(
        result.stderr
      )
    if (unsafeMatch) {
      return { kind: 'unsafe', path: unsafeMatch[1] }
    }

    return { kind: 'missing' }
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return { kind: 'missing' }
    }
    throw err
  }
}

export async function getUpstreamRefForRef(path: string, ref?: string) {
  const rev = (ref ?? '') + '@{upstream}'
  const args = ['rev-parse', '--symbolic-full-name', rev]
  const opts = { successExitCodes: new Set([0, 128]) }
  const result = await git(args, path, 'getUpstreamRefForRef', opts)

  return result.exitCode === 0 ? result.stdout.trim() : null
}

export async function getUpstreamRemoteNameForRef(path: string, ref?: string) {
  const remoteRef = await getUpstreamRefForRef(path, ref)
  return remoteRef?.match(/^refs\/remotes\/([^/]+)\//)?.[1] ?? null
}

export const getCurrentUpstreamRef = (path: string) =>
  getUpstreamRefForRef(path)

export const getCurrentUpstreamRemoteName = (path: string) =>
  getUpstreamRemoteNameForRef(path)

/**
 * Get the current branch name for the repository at the given path.
 *
 * Returns the branch name (e.g. `"main"`) if on a named branch,
 * or `undefined` if HEAD is detached.
 */
export async function getCurrentBranch(
  path: string
): Promise<string | undefined> {
  const result = await git(
    ['symbolic-ref', '--short', 'HEAD'],
    path,
    'getCurrentBranch',
    { successExitCodes: new Set([0, 128]) }
  )

  if (result.exitCode === 128) {
    return undefined
  }

  return result.stdout.trim()
}
