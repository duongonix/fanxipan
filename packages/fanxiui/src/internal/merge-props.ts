export function mergeProps<T extends Record<string, any>>(a: T, b: T): T {
  return { ...a, ...b };
}

