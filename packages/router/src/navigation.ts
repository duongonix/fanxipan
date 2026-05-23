import { normalizePath } from "./route-record.js";
import { pushUrl, replaceUrl } from "./history.js";
import type { NavigateOptions } from "./types.js";

export function navigateTo(to: string | number, options: NavigateOptions | undefined, onAfter: () => void): void {
  if (typeof to === "number") {
    if (typeof window !== "undefined") window.history.go(to);
    return;
  }
  const nextPath = normalizePathAndKeepQuery(to);
  if (options?.replace) replaceUrl(nextPath);
  else pushUrl(nextPath);
  onAfter();
}

export function normalizePathAndKeepQuery(input: string): string {
  const [beforeHash, hash = ""] = input.split("#");
  const [path, query = ""] = beforeHash.split("?");
  const out = normalizePath(path);
  const queryPart = query ? `?${query}` : "";
  const hashPart = hash ? `#${hash}` : "";
  return `${out}${queryPart}${hashPart}`;
}
