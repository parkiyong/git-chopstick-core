import { stat } from 'fs/promises'

export const directoryExists = async (path: string) => {
  try {
    const s = await stat(path)
    return s.isDirectory()
  } catch {
    return false
  }
}
