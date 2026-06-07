export function removeRemotePrefix(name: string): string | null {
  const pieces = name.match(/^[^/]+\/(.*)/)
  return pieces ? pieces[1] : null
}
