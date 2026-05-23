export function serializeForHtml(value: unknown): string {
  const json = JSON.stringify(value);
  return json
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

export function deserializeFromHtml<T>(value: string): T {
  return JSON.parse(value) as T;
}
