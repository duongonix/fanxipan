import type { RouteManifest, RouteManifestEntry } from "./types.js";

export interface ManifestMatch {
  entry: RouteManifestEntry;
  params: Record<string, string>;
}

export function matchManifestRoute(manifest: RouteManifest, pathname: string): ManifestMatch | null {
  return matchManifestRouteByKinds(manifest, pathname, ["page"]);
}

export function matchManifestRouteByKinds(
  manifest: RouteManifest,
  pathname: string,
  kinds: Array<"page" | "endpoint" | "layout" | "error">
): ManifestMatch | null {
  const candidates = manifest.entries
    .filter((entry) =>
      entry.files.some((file) =>
        kinds.includes(file.kind as "page" | "endpoint" | "layout" | "error")
      )
    )
    .sort((a, b) => scoreEntry(b) - scoreEntry(a));

  for (const entry of candidates) {
    const params = matchPath(entry.path, pathname);
    if (params) return { entry, params };
  }

  return null;
}

function matchPath(routePath: string, pathname: string): Record<string, string> | null {
  const routeSegments = splitPath(routePath);
  const pathSegments = splitPath(pathname);
  const params: Record<string, string> = {};

  let ri = 0;
  let pi = 0;
  while (ri < routeSegments.length) {
    const segment = routeSegments[ri];
    if (segment.startsWith("*")) {
      const key = segment.slice(1) || "rest";
      params[key] = pathSegments.slice(pi).join("/");
      return params;
    }

    const isOptional = segment.startsWith(":") && segment.endsWith("?");
    if (isOptional) {
      const key = segment.slice(1, -1);
      if (pi < pathSegments.length) {
        params[key] = pathSegments[pi]!;
        pi += 1;
      }
      ri += 1;
      continue;
    }

    if (pi >= pathSegments.length) return null;
    if (segment.startsWith(":")) {
      params[segment.slice(1)] = pathSegments[pi]!;
      ri += 1;
      pi += 1;
      continue;
    }
    if (segment !== pathSegments[pi]) return null;
    ri += 1;
    pi += 1;
  }

  return pi === pathSegments.length ? params : null;
}

function scoreEntry(entry: RouteManifestEntry): number {
  let score = 0;
  for (const segment of splitPath(entry.path)) {
    if (segment.startsWith("*")) score += 1;
    else if (segment.startsWith(":")) score += segment.endsWith("?") ? 2 : 3;
    else score += 5;
  }
  return score;
}

function splitPath(input: string): string[] {
  return input.split("/").filter(Boolean);
}
