import { git, isMaxBufferExceededError } from './core.js'

import { Repository } from '../models/repository.js'
import { GitError } from './exec.js'
import { coerceToBuffer } from './coerce-to-buffer.js'

/**
 * Retrieve the binary contents of a blob from the repository at a given
 * reference, commit, or tree.
 *
 * Returns a promise that will produce a Buffer instance containing
 * the binary contents of the blob or an error if the file doesn't
 * exists in the given revision.
 *
 * @param repository - The repository from where to read the blob
 *
 * @param commitish  - A commit SHA or some other identifier that
 *                     ultimately dereferences to a commit/tree.
 *
 * @param path       - The file path, relative to the repository
 *                     root from where to read the blob contents
 */
export const getBlobContents = (
  repository: Repository,
  commitish: string,
  path: string
) =>
  git(['show', `${commitish}:${path}`], repository.path, 'getBlobContents', {
    successExitCodes: new Set([0, 1]),
    encoding: 'buffer',
  }).then(r => r.stdout)

/**
 * Get the text contents of a file at a specific commit, using a path string.
 *
 * Returns the file contents as a string, or throws if the file doesn't
 * exist in the given commit.
 *
 * @param repoPath - The repository path on disk
 * @param sha      - The commit SHA to read the file from
 * @param file     - The file path relative to the repository root
 */
export async function getFileAtCommit(
  repoPath: string,
  sha: string,
  file: string
): Promise<string> {
  const result = await git(
    ['show', `${sha}:${file}`],
    repoPath,
    'getFileAtCommit',
    { successExitCodes: new Set([0, 1]) }
  )

  if (result.exitCode !== 0) {
    throw new Error(`File '${file}' not found at commit ${sha}`)
  }

  return result.stdout
}
/**
 * Retrieve some or all binary contents of a blob from the repository
 * at a given reference, commit, or tree. This is almost identical
 * to the getBlobContents method except that it supports only reading
 * a maximum number of bytes.
 *
 * Returns a promise that will produce a Buffer instance containing
 * the binary contents of the blob or an error if the file doesn't
 * exists in the given revision.
 *
 * @param repository - The repository from where to read the blob
 *
 * @param commitish  - A commit SHA or some other identifier that
 *                     ultimately dereferences to a commit/tree.
 *
 * @param path       - The file path, relative to the repository
 *                     root from where to read the blob contents
 *
 * @param length     - The maximum number of bytes to read from
 *                     the blob. Note that the number of bytes
 *                     returned may always be less than this number.
 */
export async function getPartialBlobContents(
  repository: Repository,
  commitish: string,
  path: string,
  length: number
): Promise<Buffer | null> {
  return getPartialBlobContentsCatchPathNotInRef(
    repository,
    commitish,
    path,
    length
  )
}

export async function getPartialBlobContentsCatchPathNotInRef(
  repository: Repository,
  commitish: string,
  path: string,
  length: number
): Promise<Buffer | null> {
  const args = ['show', `${commitish}:${path}`]

  return git(args, repository.path, 'getPartialBlobContentsCatchPathNotInRef', {
    maxBuffer: length,
    expectedErrors: new Set([GitError.PathExistsButNotInRef]),
    encoding: 'buffer',
  })
    .then(r =>
      r.gitError === GitError.PathExistsButNotInRef ? null : r.stdout
    )
    .catch(e =>
      isMaxBufferExceededError(e) ? coerceToBuffer(e.stdout) : Promise.reject(e)
    )
}
