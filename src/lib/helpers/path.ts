import * as Path from 'path'

export function normalizePath(path: string): string {
  return Path.normalize(path)
}
