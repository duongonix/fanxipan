import { normalizePath } from "./route-record.js";
import type { IsActiveOptions, RouteState } from "./types.js";

export function makeIsActive(route: RouteState): (path: string, options?: IsActiveOptions) => boolean {
  return (path: string, options?: IsActiveOptions) => {
    const exact = options?.exact ?? true;
    const current = normalizePath(route.path || "/");
    const target = normalizePath(path);
    if (exact) return current === target;
    return current === target || current.startsWith(`${target}/`);
  };
}
