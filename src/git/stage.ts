import { Repository } from '../models/repository.js'
import {
  WorkingDirectoryFileChange,
  isConflictedFileStatus,
  GitStatusEntry,
  isConflictWithMarkers,
} from '../models/status.js'
import { ManualConflictResolution } from '../models/manual-conflict-resolution.js'
import { assertNever } from '../lib/fatal-error.js'
import { removeConflictedFile } from './rm.js'
import { checkoutConflictedFile } from './checkout.js'
import { addConflictedFile } from './add.js'

/**
 * Stages a file with the given manual resolution method. Useful for resolving binary conflicts at commit-time.
 *
 * @param repository
 * @param file conflicted file to stage
 * @param manualResolution method to resolve the conflict of file
 * @returns true if successful, false if something went wrong
 */
export async function stageManualConflictResolution(
  repository: Repository,
  file: WorkingDirectoryFileChange,
  manualResolution: ManualConflictResolution
): Promise<void> {
  const { status } = file
  // if somehow the file isn't in a conflicted state
  if (!isConflictedFileStatus(status)) {
    console.error(`tried to manually resolve unconflicted file (${file.path})`)
    return
  }

  if (isConflictWithMarkers(status) && status.conflictMarkerCount === 0) {
    // If somehow the user used the Desktop UI to solve the conflict via ours/theirs
    // but afterwards resolved manually the conflicts via an editor, used the manually
    // resolved file.
    return
  }

  const chosen =
    manualResolution === ManualConflictResolution.theirs
      ? status.entry.them
      : status.entry.us

  const addedInBoth =
    status.entry.us === GitStatusEntry.Added &&
    status.entry.them === GitStatusEntry.Added

  if (chosen === GitStatusEntry.UpdatedButUnmerged || addedInBoth) {
    await checkoutConflictedFile(repository, file, manualResolution)
  }

  switch (chosen) {
    case GitStatusEntry.Deleted:
      return removeConflictedFile(repository, file)
    case GitStatusEntry.Added:
    case GitStatusEntry.UpdatedButUnmerged:
      return addConflictedFile(repository, file)
    default:
      assertNever(chosen, 'unaccounted for git status entry possibility')
  }
}

/**
 * Stages all resolved conflict files before a checkout operation to prevent
 * "error: you need to resolve your current index first" from git.
 *
 * Handles two kinds of resolved conflicts:
 *  - Text conflicts resolved in an external editor (conflictMarkerCount === 0)
 *  - Manual conflicts where the user chose ours/theirs in the Desktop UI
 */
export async function stageResolvedConflictFiles(
  repository: Repository,
  files: ReadonlyArray<WorkingDirectoryFileChange>,
  manualResolutions: ReadonlyMap<string, ManualConflictResolution>
): Promise<void> {
  for (const file of files) {
    const { status } = file
    if (!isConflictedFileStatus(status)) {
      continue
    }

    const manualResolution = manualResolutions.get(file.path)

    if (manualResolution !== undefined) {
      // Binary/manual conflict resolved via Desktop UI — stage it
      await stageManualConflictResolution(repository, file, manualResolution)
    } else if (
      isConflictWithMarkers(status) &&
      status.conflictMarkerCount === 0
    ) {
      // Text conflict resolved in external editor — stage it
      await addConflictedFile(repository, file)
    }
  }
}
