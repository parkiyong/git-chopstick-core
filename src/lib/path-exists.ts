import { access } from 'fs/promises'

export const pathExists = (path: string) =>
  access(path).then(
    () => true,
    () => false
  )
