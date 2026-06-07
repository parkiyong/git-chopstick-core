export function withHooksEnv<T>(
  fn: (env: Record<string, string | undefined>) => Promise<T>,
  _path: string,
  _options?: { interceptHooks?: string[] }
): Promise<T> {
  return fn({})
}
