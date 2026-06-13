import { git, IGitStringExecutionOptions } from './core.js'

import { Repository } from '../models/repository.js'
import { Commit } from '../models/commit.js'
import { IRevertProgress } from '../models/progress.js'

import { executionOptionsWithProgress } from '../lib/progress/from-process.js'
import { RevertProgressParser } from '../lib/progress/revert.js'
import {
  envForRemoteOperation,
  getFallbackUrlForProxyResolve,
} from './environment.js'
import { IRemote } from '../models/remote.js'

/**
 * Creates a new commit that reverts the changes of a previous commit
 *
 * @param repository  - The repository to update
 *
 * @param commit         - The SHA of the commit to be reverted
 */
export async function revertCommit(
  repository: Repository,
  commit: Commit,
  currentRemote: IRemote | null,
  progressCallback?: (progress: IRevertProgress) => void
) {
  const args = ['revert']
  if (commit.parentSHAs.length > 1) {
    args.push('-m', '1')
  }

  args.push(commit.sha)

  let opts: IGitStringExecutionOptions = {}
  if (progressCallback) {
    const env = await envForRemoteOperation(
      getFallbackUrlForProxyResolve(repository, currentRemote)
    )
    opts = await executionOptionsWithProgress(
      { env, trackLFSProgress: true },
      new RevertProgressParser(),
      progress => {
        const description =
          progress.kind === 'progress' ? progress.details.text : progress.text
        const title = progress.kind === 'progress' ? progress.details.title : ''
        const value = progress.percent

        progressCallback({ kind: 'revert', description, value, title })
      }
    )
  }

  await git(args, repository.path, 'revert', opts)
}
