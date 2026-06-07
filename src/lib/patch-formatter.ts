import { DiffSelection } from '../models/diff'
import { WorkingDirectoryFileChange } from '../models/status'
import { Repository } from '../models/repository'

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
