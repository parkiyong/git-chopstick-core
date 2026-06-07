import { Branch } from '../models/branch'
import { ComputedAction } from '../models/computed-action'
import { Repository } from '../models/repository'
import { git, isGitError } from './core'
import { GitError } from './exec'

type MergeTreeResult =
  | { kind: ComputedAction.Clean }
  | { kind: ComputedAction.Conflicts; conflictedFiles: number }
  | { kind: ComputedAction.Invalid }

export async function determineMergeability(
  repository: Repository,
  ours: Branch,
  theirs: Branch
) {
  return git(
    [
      'merge-tree',
      '--write-tree',
      '--name-only',
      '--no-messages',
      '-z',
      ours.tip.sha,
      theirs.tip.sha,
    ],
    repository.path,
    'determineMergeability',
    { successExitCodes: new Set([0, 1]) }
  )
    .then<MergeTreeResult>(({ stdout }) => {
      const conflictedFiles = (stdout.match(/\0/g)?.length ?? 0) - 1
      return conflictedFiles > 0
        ? { kind: ComputedAction.Conflicts, conflictedFiles }
        : { kind: ComputedAction.Clean }
    })
    .catch<MergeTreeResult>(e =>
      isGitError(e, GitError.CannotMergeUnrelatedHistories)
        ? Promise.resolve({ kind: ComputedAction.Invalid })
        : Promise.reject(e)
    )
}
