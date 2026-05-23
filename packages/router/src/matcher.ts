import { normalizePath } from "./route-record.js";
import type { RouteRecord } from "./types.js";

export type MatchResult = {
  record: RouteRecord | null;
  params: Record<string, string>;
};

export function matchRoute(records: RouteRecord[], path: string): MatchResult {
  const clean = normalizePath(path);
  for (const record of records) {
    const m = clean.match(record.regex);
    if (!m) continue;
    const params: Record<string, string> = {};
    for (let i = 0; i < record.params.length; i += 1) {
      params[record.params[i]] = decodeURIComponent(m[i + 1] ?? "");
    }
    return { record, params };
  }
  return { record: null, params: {} };
}
