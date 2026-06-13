export * from './branch.js'
export * from './cherry-pick.js'
export * from './clone-options.js'
export * from './commit.js'
export * from './commit-identity.js'
export * from './git-author.js'
export * from './manual-conflict-resolution.js'
export * from './merge.js'
export * from './multi-commit-operation.js'
export * from './progress.js'
export * from './remote.js'
export * from './repository.js'
export * from './stash-entry.js'
export * from './worktree.js'
export * from './diff/index.js'

// computed-action and rebase both export ComputedAction — use explicit exports
export { ComputedAction } from './computed-action.js'
export type { RebaseInternalState, RebaseProgressOptions } from './rebase.js'

// status and submodule both export SubmoduleStatus — use explicit exports
export {
  AppFileStatusKind,
  CommittedFileChange,
  WorkingDirectoryFileChange,
  WorkingDirectoryStatus,
  FileChange,
  appFileStatusToString,
  isConflictedFileStatus,
  isConflictWithMarkers,
  GitStatusEntry,
  UnmergedEntrySummary,
} from './status.js'
export type { AppFileStatus } from './status.js'
export type { SubmoduleStatus } from './status.js'

export type { SubmoduleEntry } from './submodule.js'
