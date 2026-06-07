import { IMultiCommitOperationProgress } from './progress'
import { CommitOneLine } from './commit'

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
