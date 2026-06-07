export interface IRemote {
  readonly name: string
  readonly url: string
}

export function remoteEquals(x: IRemote | null, y: IRemote | null) {
  if (x === y) return true
  if (x === null || y === null) return false
  return x.name === y.name && x.url === y.url
}
