export function toStyle(style?: string | Record<string, string | number>) {
  if (!style) return "";
  if (typeof style === "string") return style;
  return Object.entries(style).map(([k, v]) => `${k}:${String(v)}`).join(";");
}
