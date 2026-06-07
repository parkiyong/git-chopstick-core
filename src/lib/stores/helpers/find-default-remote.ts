export function findDefaultRemote(remotes: any[]): any | null {
  return remotes.length > 0 ? remotes[0] : null
}
