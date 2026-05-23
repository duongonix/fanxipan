export function parseQuery(search: string): Record<string, string> {
  const out: Record<string, string> = {};
  const sp = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  for (const [k, v] of sp.entries()) out[k] = v;
  return out;
}
