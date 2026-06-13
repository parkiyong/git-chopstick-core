export function fatalError(msg: string): never {
  throw new Error(msg)
}

export function assertNever(_x: never, message: string): never {
  throw new Error(message)
}

export function forceUnwrap<T>(message: string, x: T | null | undefined): T {
  if (x == null) {
    return fatalError(message)
  }
  return x
}

export function assertNonNullable<T>(
  x: T,
  message: string
): asserts x is NonNullable<T> {
  if (x == null) {
    return fatalError(message)
  }
}
