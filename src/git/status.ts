import { getFilesWithConflictMarkers } from './diff-check.js'
import {
  WorkingDirectoryStatus,
  WorkingDirectoryFileChange,
  AppFileStatus,
  FileEntry,
  GitStatusEntry,
  AppFileStatusKind,
  UnmergedEntry,
  ConflictedFileStatus,
  UnmergedEntrySummary,
} from '../models/status.js'
import {
  parsePorcelainStatus,
  mapStatus,
  IStatusEntry,
  IStatusHeader,
  isStatusHeader,
  isStatusEntry,
} from '../lib/status-parser.js'
import { DiffSelectionType, DiffSelection } from '../models/diff/index.js'
import { Repository } from '../models/repository.js'
import { IAheadBehind } from '../models/branch.js'
import { fatalError } from '../lib/fatal-error.js'
import { isMergeHeadSet, isSquashMsgSet } from './merge.js'
import { getBinaryPaths } from './diff.js'
import { getRebaseInternalState } from './rebase.js'
import { RebaseInternalState } from '../models/rebase.js'
import { isCherryPickHeadFound } from './cherry-pick.js'
import { git } from './index.js'

// Re-export DiffSelectionType and DiffSelection so consumers can import from the barrel
// without importing directly from models/diff
export { DiffSelectionType, DiffSelection } from '../models/diff/index.js'

/** The encapsulation of the result from 'git status' */
export interface IStatusResult {
  /** The name of the current branch */
  readonly currentBranch?: string

  /** The name of the current upstream branch */
  readonly currentUpstreamBranch?: string

  /** The SHA of the tip commit of the current branch */
  readonly currentTip?: string

  /** How many commits ahead and behind
   *  the `currentBranch` is compared to the `currentUpstreamBranch`
   */
  readonly branchAheadBehind?: IAheadBehind

  /** true if the repository exists at the given location */
  readonly exists: boolean

  /** true if repository is in a conflicted state */
  readonly mergeHeadFound: boolean

  /** true merge --squash operation started */
  readonly squashMsgFound: boolean

  /** details about the rebase operation, if found */
  readonly rebaseInternalState: RebaseInternalState | null

  /** true if repository is in cherry pick state */
  readonly isCherryPickingHeadFound: boolean

  /** the absolute path to the repository's working directory */
  readonly workingDirectory: WorkingDirectoryStatus

  /** whether conflicting files present on repository */
  readonly doConflictedFilesExist: boolean
}

interface IStatusHeadersData {
  currentBranch?: string
  currentUpstreamBranch?: string
  currentTip?: string
  branchAheadBehind?: IAheadBehind
  match: RegExpMatchArray | null
}

type ConflictFilesDetails = {
  conflictCountsByPath: ReadonlyMap<string, number>
  binaryFilePaths: ReadonlyArray<string>
}

function parseConflictedState(
  entry: UnmergedEntry,
  path: string,
  conflictDetails: ConflictFilesDetails
): ConflictedFileStatus {
  switch (entry.action) {
    case UnmergedEntrySummary.BothAdded: {
      const isBinary = conflictDetails.binaryFilePaths.includes(path)
      if (!isBinary) {
        return {
          kind: AppFileStatusKind.Conflicted,
          entry,
          conflictMarkerCount:
            conflictDetails.conflictCountsByPath.get(path) || 0,
        }
      } else {
        return {
          kind: AppFileStatusKind.Conflicted,
          entry,
        }
      }
    }
    case UnmergedEntrySummary.BothModified: {
      const isBinary = conflictDetails.binaryFilePaths.includes(path)
      if (!isBinary) {
        return {
          kind: AppFileStatusKind.Conflicted,
          entry,
          conflictMarkerCount:
            conflictDetails.conflictCountsByPath.get(path) || 0,
        }
      } else {
        return {
          kind: AppFileStatusKind.Conflicted,
          entry,
        }
      }
    }
    default:
      return {
        kind: AppFileStatusKind.Conflicted,
        entry,
      }
  }
}

function convertToAppStatus(
  path: string,
  entry: FileEntry,
  conflictDetails: ConflictFilesDetails,
  oldPath?: string
): AppFileStatus {
  if (entry.kind === 'ordinary') {
    switch (entry.type) {
      case 'added':
        return {
          kind: AppFileStatusKind.New,
          submoduleStatus: entry.submoduleStatus,
        }
      case 'modified':
        return {
          kind: AppFileStatusKind.Modified,
          submoduleStatus: entry.submoduleStatus,
        }
      case 'deleted':
        return {
          kind: AppFileStatusKind.Deleted,
          submoduleStatus: entry.submoduleStatus,
        }
    }
  } else if (entry.kind === 'copied' && oldPath != null) {
    return {
      kind: AppFileStatusKind.Copied,
      oldPath,
      submoduleStatus: entry.submoduleStatus,
      renameIncludesModifications: false,
    }
  } else if (entry.kind === 'renamed' && oldPath != null) {
    return {
      kind: AppFileStatusKind.Renamed,
      oldPath,
      submoduleStatus: entry.submoduleStatus,
      renameIncludesModifications:
        entry.workingTree === GitStatusEntry.Modified ||
        (entry.renameOrCopyScore !== undefined &&
          entry.renameOrCopyScore < 100),
    }
  } else if (entry.kind === 'untracked') {
    return {
      kind: AppFileStatusKind.Untracked,
      submoduleStatus: entry.submoduleStatus,
    }
  } else if (entry.kind === 'conflicted') {
    return parseConflictedState(entry, path, conflictDetails)
  }

  return fatalError(`Unknown file status ${status}`)
}

// List of known conflicted index entries for a file, extracted from mapStatus
// inside `app/src/lib/status-parser.ts` for convenience
const conflictStatusCodes = ['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU']

/**
 *  Retrieve the status for a given repository,
 *  and fail gracefully if the location is not a Git repository
 */
export async function getStatus(
  repository: Repository
): Promise<IStatusResult | null>
export async function getStatus(
  repository: Repository,
  includeUntracked: boolean
): Promise<IStatusResult | null>
export async function getStatus(
  repository: Repository,
  includeUntracked: boolean,
  rejectOnError: true
): Promise<IStatusResult>
export async function getStatus(
  repository: Repository,
  includeUntracked: boolean,
  rejectOnError: false
): Promise<IStatusResult | null>
export async function getStatus(
  repository: Repository,
  includeUntracked = true,
  rejectOnError = false
): Promise<IStatusResult | null> {
  const args = [
    '--no-optional-locks',
    'status',
    ...(includeUntracked ? ['--untracked-files=all'] : []),
    '--branch',
    '--porcelain=2',
    '-z',
  ]

  const { stdout, exitCode } = await git(args, repository.path, 'getStatus', {
    successExitCodes: new Set(rejectOnError ? [0] : [0, 128]),
    encoding: 'buffer',
  })

  if (exitCode === 128) {
    console.debug(
      `'git status' returned 128 for '${repository.path}' and is likely missing its .git directory`
    )
    return null
  }

  const parsed = parsePorcelainStatus(stdout)
  const headers = parsed.filter(isStatusHeader)
  const entries = parsed.filter(isStatusEntry)

  const mergeHeadFound = await isMergeHeadSet(repository)
  const conflictedFilesInIndex = entries.filter(e =>
    conflictStatusCodes.includes(e.statusCode)
  )
  const rebaseInternalState = await getRebaseInternalState(repository)

  const conflictDetails = await getConflictDetails(
    repository,
    mergeHeadFound,
    conflictedFilesInIndex,
    rebaseInternalState
  )

  // Map of files keyed on their paths.
  const files = entries.reduce(
    (files, entry) => buildStatusMap(files, entry, conflictDetails),
    new Map<string, WorkingDirectoryFileChange>()
  )

  const {
    currentBranch,
    currentUpstreamBranch,
    currentTip,
    branchAheadBehind,
  } = headers.reduce(parseStatusHeader, {
    currentBranch: undefined,
    currentUpstreamBranch: undefined,
    currentTip: undefined,
    branchAheadBehind: undefined,
    match: null,
  })

  const workingDirectory = WorkingDirectoryStatus.fromFiles([...files.values()])

  const isCherryPickingHeadFound = await isCherryPickHeadFound(repository)

  const squashMsgFound = await isSquashMsgSet(repository)

  return {
    currentBranch,
    currentTip,
    currentUpstreamBranch,
    branchAheadBehind,
    exists: true,
    mergeHeadFound,
    rebaseInternalState,
    workingDirectory,
    isCherryPickingHeadFound,
    squashMsgFound,
    doConflictedFilesExist: conflictedFilesInIndex.length > 0,
  }
}

/**
 *
 * Update map of working directory changes with a file status entry.
 * Reducer(ish).
 *
 * (Map is used here to maintain insertion order.)
 */
function buildStatusMap(
  files: Map<string, WorkingDirectoryFileChange>,
  entry: IStatusEntry,
  conflictDetails: ConflictFilesDetails
): Map<string, WorkingDirectoryFileChange> {
  const status = mapStatus(
    entry.statusCode,
    entry.submoduleStatusCode,
    entry.renameOrCopyScore
  )

  if (status.kind === 'ordinary') {
    // when a file is added in the index but then removed in the working
    // directory, the file won't be part of the commit, so we can skip
    // displaying this entry in the changes list
    if (
      status.index === GitStatusEntry.Added &&
      status.workingTree === GitStatusEntry.Deleted
    ) {
      return files
    }
  }

  if (status.kind === 'untracked') {
    // when a delete has been staged, but an untracked file exists with the
    // same path, we should ensure that we only draw one entry in the
    // changes list - see if an entry already exists for this path and
    // remove it if found
    files.delete(entry.path)
  }

  // for now we just poke at the existing summary
  const appStatus = convertToAppStatus(
    entry.path,
    status,
    conflictDetails,
    entry.oldPath
  )

  const initialSelectionType =
    appStatus.kind === AppFileStatusKind.Modified &&
    appStatus.submoduleStatus !== undefined &&
    !appStatus.submoduleStatus.commitChanged
      ? DiffSelectionType.None
      : DiffSelectionType.All

  const selection = DiffSelection.fromInitialSelection(initialSelectionType)

  files.set(
    entry.path,
    new WorkingDirectoryFileChange(entry.path, appStatus, selection)
  )
  return files
}

/**
 * Update status header based on the current header entry.
 * Reducer.
 */
function parseStatusHeader(results: IStatusHeadersData, header: IStatusHeader) {
  let {
    currentBranch,
    currentUpstreamBranch,
    currentTip,
    branchAheadBehind,
    match,
  } = results
  const value = header.value

  // This intentionally does not match branch.oid initial
  if ((match = value.match(/^branch\.oid ([a-f0-9]+)$/))) {
    currentTip = match[1]
  } else if ((match = value.match(/^branch.head (.*)/))) {
    if (match[1] !== '(detached)') {
      currentBranch = match[1]
    }
  } else if ((match = value.match(/^branch.upstream (.*)/))) {
    currentUpstreamBranch = match[1]
  } else if ((match = value.match(/^branch.ab \+(\d+) -(\d+)$/))) {
    const ahead = parseInt(match[1], 10)
    const behind = parseInt(match[2], 10)

    if (!isNaN(ahead) && !isNaN(behind)) {
      branchAheadBehind = { ahead, behind }
    }
  }
  return {
    currentBranch,
    currentUpstreamBranch,
    currentTip,
    branchAheadBehind,
    match,
  }
}

/**
 * A flattened summary of a working directory change.
 *
 * Saves consumers from digging into the nested `WorkingDirectoryFileChange.status`
 * union type to get the path, status string, and optional oldPath.
 */
export interface WorkingDirectoryChangeSummary {
  readonly path: string
  readonly status:
    | 'added'
    | 'modified'
    | 'deleted'
    | 'renamed'
    | 'copied'
    | 'conflicted'
    | 'untracked'
  readonly oldPath?: string
}

/**
 * Get a flattened list of working directory changes for a repository.
 *
 * Wraps `getStatus` and maps each `WorkingDirectoryFileChange` to a simple
 * `WorkingDirectoryChangeSummary` object, eliminating the need for consumers
 * to dig into the `AppFileStatus` union type.
 *
 * Throws if the repository path is not a valid git repository.
 */
export async function getWorkingDirectoryChanges(
  repository: Repository
): Promise<ReadonlyArray<WorkingDirectoryChangeSummary>> {
  const status = await getStatus(repository, true, true)

  return status.workingDirectory.files.map(file => {
    const summary: WorkingDirectoryChangeSummary = {
      path: file.path,
      status: statusKindToString(file.status.kind),
    }

    if (
      (file.status.kind === AppFileStatusKind.Renamed ||
        file.status.kind === AppFileStatusKind.Copied) &&
      'oldPath' in file.status &&
      file.status.oldPath !== undefined
    ) {
      return { ...summary, oldPath: file.status.oldPath }
    }

    return summary
  })
}

function statusKindToString(
  kind: AppFileStatusKind
): WorkingDirectoryChangeSummary['status'] {
  switch (kind) {
    case AppFileStatusKind.New:
      return 'added'
    case AppFileStatusKind.Modified:
      return 'modified'
    case AppFileStatusKind.Deleted:
      return 'deleted'
    case AppFileStatusKind.Renamed:
      return 'renamed'
    case AppFileStatusKind.Copied:
      return 'copied'
    case AppFileStatusKind.Conflicted:
      return 'conflicted'
    case AppFileStatusKind.Untracked:
      return 'untracked'
  }
}

/**
 * A flattened summary of a working directory change that also includes
 * the `DiffSelection` for each file, enabling consumers to programmatically
 * stage/unstage individual files or partial hunks.
 *
 * Use `fileChangeSummaryToWorkingDirectoryFile()` to convert back to
 * `WorkingDirectoryFileChange[]` for use with `stageFiles()`.
 */
export interface WorkingDirectoryFileChangeSummary {
  readonly path: string
  readonly status:
    | 'added'
    | 'modified'
    | 'deleted'
    | 'renamed'
    | 'copied'
    | 'conflicted'
    | 'untracked'
  readonly oldPath?: string

  /**
   * Whether this file is selected for commit.
   * - `All`: fully staged for commit
   * - `None`: excluded from commit
   * - `Partial`: only selected hunks/lines are staged
   */
  readonly selectionType: DiffSelectionType

  /**
   * The full `DiffSelection` object. Use the `withLineSelection()` or
   * `withSelectAll()` / `withSelectNone()` methods to modify the selection,
   * then pass through `fileChangeSummaryToWorkingDirectoryFile()` to
   * create `WorkingDirectoryFileChange` instances for `stageFiles()`.
   */
  readonly selection: DiffSelection
}

/**
 * Get a detailed list of working directory changes, including the
 * `DiffSelection` for each file.
 *
 * Unlike `getWorkingDirectoryChanges()`, this variant includes the selection
 * state so consumers can programmatically stage/unstage individual files
 * or partial hunks.
 *
 * Round-trip with `fileChangeSummaryToWorkingDirectoryFile()` to convert
 * back to `WorkingDirectoryFileChange[]` for use with `stageFiles()`.
 *
 * @see getWorkingDirectoryChanges for a lighter variant without selection info
 * @see fileChangeSummaryToWorkingDirectoryFile to convert back to WorkingDirectoryFileChange
 */
export async function getWorkingDirectoryChangesDetailed(
  repository: Repository
): Promise<ReadonlyArray<WorkingDirectoryFileChangeSummary>> {
  const status = await getStatus(repository, true, true)

  return status.workingDirectory.files.map(file => {
    const summary: WorkingDirectoryFileChangeSummary = {
      path: file.path,
      status: statusKindToString(file.status.kind),
      selectionType: file.selection.getSelectionType(),
      selection: file.selection,
    }

    if (
      (file.status.kind === AppFileStatusKind.Renamed ||
        file.status.kind === AppFileStatusKind.Copied) &&
      'oldPath' in file.status &&
      file.status.oldPath !== undefined
    ) {
      return { ...summary, oldPath: file.status.oldPath }
    }

    return summary
  })
}

/**
 * Convert a `WorkingDirectoryFileChangeSummary` back to a
 * `WorkingDirectoryFileChange` for use with `stageFiles()`.
 *
 * This is a lossy conversion — the reconstructed `AppFileStatus` contains
 * only the information available in the summary (path, status kind, oldPath).
 * Submodule status and conflict marker counts are not preserved.
 *
 * @example
 * const changes = await getWorkingDirectoryChangesDetailed(repo)
 * // Exclude deleted files from the commit
 * const toStage = changes
 *   .filter(c => c.status !== 'deleted')
 *   .map(fileChangeSummaryToWorkingDirectoryFile)
 * await stageFiles(repo, toStage)
 */
export function fileChangeSummaryToWorkingDirectoryFile(
  summary: WorkingDirectoryFileChangeSummary
): WorkingDirectoryFileChange {
  let appStatus: AppFileStatus

  switch (summary.status) {
    case 'added':
      appStatus = { kind: AppFileStatusKind.New }
      break
    case 'modified':
      appStatus = { kind: AppFileStatusKind.Modified }
      break
    case 'deleted':
      appStatus = { kind: AppFileStatusKind.Deleted }
      break
    case 'renamed':
      appStatus = {
        kind: AppFileStatusKind.Renamed,
        oldPath: summary.oldPath ?? summary.path,
        renameIncludesModifications: false,
      }
      break
    case 'copied':
      appStatus = {
        kind: AppFileStatusKind.Copied,
        oldPath: summary.oldPath ?? summary.path,
        renameIncludesModifications: false,
      }
      break
    case 'conflicted':
      appStatus = {
        kind: AppFileStatusKind.Conflicted,
        entry: {
          kind: 'conflicted' as const,
          action: UnmergedEntrySummary.BothModified,
          us: GitStatusEntry.UpdatedButUnmerged,
          them: GitStatusEntry.UpdatedButUnmerged,
        },
      }
      break
    case 'untracked':
      appStatus = { kind: AppFileStatusKind.Untracked }
      break
  }

  return new WorkingDirectoryFileChange(
    summary.path,
    appStatus,
    summary.selection
  )
}

async function getMergeConflictDetails(
  repository: Repository,
  conflictedFilesInIndex: ReadonlyArray<IStatusEntry>
) {
  const conflictCountsByPath = await getFilesWithConflictMarkers(
    repository.path
  )
  const binaryFilePaths = await getBinaryPaths(
    repository,
    'MERGE_HEAD',
    conflictedFilesInIndex
  )
  return {
    conflictCountsByPath,
    binaryFilePaths,
  }
}

async function getRebaseConflictDetails(
  repository: Repository,
  conflictedFilesInIndex: ReadonlyArray<IStatusEntry>
) {
  const conflictCountsByPath = await getFilesWithConflictMarkers(
    repository.path
  )
  const binaryFilePaths = await getBinaryPaths(
    repository,
    'REBASE_HEAD',
    conflictedFilesInIndex
  )
  return {
    conflictCountsByPath,
    binaryFilePaths,
  }
}

/**
 * We need to do these operations to detect conflicts that were the result
 * of popping a stash into the index
 */
async function getWorkingDirectoryConflictDetails(
  repository: Repository,
  conflictedFilesInIndex: ReadonlyArray<IStatusEntry>
) {
  const conflictCountsByPath = await getFilesWithConflictMarkers(
    repository.path
  )
  let binaryFilePaths: ReadonlyArray<string> = []
  try {
    // its totally fine if HEAD doesn't exist, which throws an error
    binaryFilePaths = await getBinaryPaths(
      repository,
      'HEAD',
      conflictedFilesInIndex
    )
  } catch (error) {}

  return {
    conflictCountsByPath,
    binaryFilePaths,
  }
}

/**
 * gets the conflicted files count and binary file paths in a given repository.
 * for computing an `IStatusResult`.
 *
 * @param repository to get details from
 * @param mergeHeadFound whether a merge conflict has been detected
 * @param conflictedFilesInIndex all files marked as being conflicted in the
 *                               index. Used to check for files using the binary
 *                               merge driver and whether it looks like a stash
 *                               has introduced conflicts
 * @param rebaseInternalState details about the current rebase operation (if
 * found)
 */
async function getConflictDetails(
  repository: Repository,
  mergeHeadFound: boolean,
  conflictedFilesInIndex: ReadonlyArray<IStatusEntry>,
  rebaseInternalState: RebaseInternalState | null
): Promise<ConflictFilesDetails> {
  try {
    if (mergeHeadFound) {
      return await getMergeConflictDetails(repository, conflictedFilesInIndex)
    }

    if (rebaseInternalState !== null) {
      return await getRebaseConflictDetails(repository, conflictedFilesInIndex)
    }

    // If there's conflicted files in the index but we don't have a merge head
    // or a rebase internal state, then we're likely in a situation where a
    // stash has introduced conflicts
    if (conflictedFilesInIndex.length > 0) {
      return await getWorkingDirectoryConflictDetails(
        repository,
        conflictedFilesInIndex
      )
    }
  } catch (error) {
    console.error(
      'Unexpected error from git operations in getConflictDetails',
      error
    )
  }
  return {
    conflictCountsByPath: new Map<string, number>(),
    binaryFilePaths: new Array<string>(),
  }
}
