import { IMultiCommitOperationProgress } from './progress.js'
import { CommitOneLine } from './commit.js'

export type RebaseInternalState = {
  readonly targetBranch: string
  readonly baseBranchTip: string
  readonly originalBranchTip: string
}

export type RebaseProgressOptions = {
  commits: ReadonlyArray<CommitOneLine>
  progressCallback: (progress: IMultiCommitOperationProgress) => void
}

export enum ComputedAction {
  Clean = 'Clean',
  Conflicts = 'Conflicts',
  Invalid = 'Invalid',
  Loading = 'Loading',
}
