export async function withTrampolineEnv<T>(
  fn: (env: Record<string, string | undefined>) => Promise<T>,
  _path: string,
  _isBackgroundTask: boolean,
  _existingEnv?: Record<string, string | undefined>
): Promise<T> {
  return fn({})
}
