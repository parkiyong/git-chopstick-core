import { IMultiCommitOperationProgress } from './progress'
import { CommitOneLine } from './commit'

export interface ICherryPickSnapshot {
  readonly sha: string
  readonly parentCount: number
  readonly progress: IMultiCommitOperationProgress | null
  readonly commits: ReadonlyArray<CommitOneLine>
  readonly remainingCommits: ReadonlyArray<CommitOneLine>
  readonly targetBranchUndoSha: string
  readonly cherryPickedCount: number
}
