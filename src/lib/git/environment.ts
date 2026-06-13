import { IRemote } from '../../models/remote.js'

export async function envForRemoteOperation(
  _url: string | null
): Promise<Record<string, string | undefined>> {
  return {}
}

export function getFallbackUrlForProxyResolve(
  _repository: any,
  _remote: IRemote | null
): string | null {
  return null
}
