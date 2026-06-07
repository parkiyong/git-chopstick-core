import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

export function getTempFilePath(prefix: string): string {
  return join(mkdtempSync(join(tmpdir(), prefix)), 'temp')
}
