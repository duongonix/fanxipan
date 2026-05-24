let counter = 0;
export function createId(prefix = "fanxiui") {
  counter += 1;
  return `${prefix}-${counter}`;
}

