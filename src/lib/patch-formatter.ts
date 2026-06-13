import { DiffSelection } from '../models/diff/index.js'
import { WorkingDirectoryFileChange } from '../models/status.js'
import { Repository } from '../models/repository.js'

export async function formatPatch(
  _repository: Repository,
  _file: WorkingDirectoryFileChange,
  _selection: DiffSelection
): Promise<string> {
  return ''
}

export async function formatPatchToDiscardChanges(
  _repository: Repository,
  _file: WorkingDirectoryFileChange
): Promise<string> {
  return ''
}
