export function measure<T>(_name: string, fn: () => Promise<T>): Promise<T> {
  return fn()
}
