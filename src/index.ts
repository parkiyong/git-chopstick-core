// ── Runtime: Core git operations ──
export { Repository } from './models/repository.js'
export { getStatus } from './git/status.js'
export { getCommits, getChangedFiles } from './git/log.js'
export { getBranches } from './git/for-each-ref.js'
export { getRemotes } from './git/remote.js'

// ── Models (classes used both as values and types) ──
export { Commit } from './models/commit.js'
export { CommitIdentity } from './models/commit-identity.js'
export { Branch, BranchType } from './models/branch.js'
export {
  CommittedFileChange,
  WorkingDirectoryFileChange,
  WorkingDirectoryStatus,
  AppFileStatusKind,
} from './models/status.js'
export { DiffSelection, DiffSelectionType } from './models/diff/diff-selection.js'

// ── Exclusively types ──
export type { IStatusResult } from './git/status.js'
export type { IChangesetData } from './git/log.js'
export type { IRemote } from './models/remote.js'
