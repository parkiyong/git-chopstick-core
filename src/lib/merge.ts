export function merge<T, U>(a: T, b: U): T & U {
  return { ...a, ...b }
}
