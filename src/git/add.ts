import { git } from './core.js'
import { Repository } from '../models/repository.js'
import { WorkingDirectoryFileChange } from '../models/status.js'

/**
 * Add a conflicted file to the index.
 *
 * Typically done after having resolved conflicts either manually
 * or through checkout --theirs/--ours.
 */
export async function addConflictedFile(
  repository: Repository,
  file: WorkingDirectoryFileChange
) {
  await git(['add', '--', file.path], repository.path, 'addConflictedFile')
}
