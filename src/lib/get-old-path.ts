import { FileChange, AppFileStatusKind } from '../models/status'

export function getOldPathOrDefault(file: FileChange) {
  if (
    file.status.kind === AppFileStatusKind.Renamed ||
    file.status.kind === AppFileStatusKind.Copied
  ) {
    return file.status.oldPath
  }
  return file.path
}
