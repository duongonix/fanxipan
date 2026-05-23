import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { RouteFileKind, RouteFileRef, RouteManifest, RouteManifestEntry } from "./types.js";

const ROUTE_FILE_MAP: Record<string, RouteFileKind> = {
  "+page.fanxi": "page",
  "+layout.fanxi": "layout",
  "+error.fanxi": "error",
  "+page.ts": "page-load",
  "+page.js": "page-load",
  "+page.mjs": "page-load",
  "+page.server.ts": "page-server",
  "+page.server.js": "page-server",
  "+page.server.mjs": "page-server",
  "+layout.ts": "layout-load",
  "+layout.js": "layout-load",
  "+layout.mjs": "layout-load",
  "+layout.server.ts": "layout-server",
  "+layout.server.js": "layout-server",
  "+layout.server.mjs": "layout-server",
  "+server.ts": "endpoint",
  "+server.js": "endpoint",
  "+server.mjs": "endpoint",
};

export function createRouteManifest(root: string, routesDir = "src/routes"): RouteManifest {
  const rootAbs = path.resolve(root);
  const routesAbs = path.resolve(rootAbs, routesDir);
  const entries = new Map<string, RouteManifestEntry>();

  walk(routesAbs, routesAbs, entries);

  return {
    root: rootAbs,
    routesDir,
    generatedAt: new Date().toISOString(),
    entries: Array.from(entries.values()).sort((a, b) => a.id.localeCompare(b.id)),
  };
}

function walk(currentAbs: string, routesAbs: string, entries: Map<string, RouteManifestEntry>) {
  const items = readdirSync(currentAbs, { withFileTypes: true });

  const relDir = toUnix(path.relative(routesAbs, currentAbs));
  const relSegments = relDir === "" ? [] : relDir.split("/");
  const routeSegments = relSegments.filter((segment) => !isIgnoredSegment(segment));
  const routePath = toRoutePath(routeSegments);
  const routeId = routeSegments.length === 0 ? "/" : `/${routeSegments.join("/")}`;

  const fileRefs: RouteFileRef[] = [];
  for (const item of items) {
    if (!item.isFile()) continue;
    const kind = ROUTE_FILE_MAP[item.name];
    if (!kind) continue;
    const relFile = toUnix(path.relative(routesAbs, path.join(currentAbs, item.name)));
    fileRefs.push({ kind, file: relFile });
  }

  if (fileRefs.length > 0) {
    entries.set(routeId, {
      id: routeId,
      path: routePath,
      segments: routeSegments,
      files: fileRefs.sort((a, b) => a.file.localeCompare(b.file)),
    });
  }

  for (const item of items) {
    if (!item.isDirectory()) continue;
    if (item.name.startsWith("_")) continue;
    const next = path.join(currentAbs, item.name);
    if (!statSync(next).isDirectory()) continue;
    walk(next, routesAbs, entries);
  }
}

function toRoutePath(routeSegments: string[]): string {
  if (routeSegments.length === 0) return "/";
  const parts = routeSegments
    .map((segment) => {
      if (isGroup(segment)) return "";
      if (segment.startsWith("[...") && segment.endsWith("]")) {
        return `*${segment.slice(4, -1)}`;
      }
      if (segment.startsWith("[[") && segment.endsWith("]]")) {
        return `:${segment.slice(2, -2)}?`;
      }
      if (segment.startsWith("[") && segment.endsWith("]")) {
        const inner = segment.slice(1, -1);
        const name = inner.includes("=") ? inner.split("=")[0] : inner;
        return `:${name}`;
      }
      return segment;
    })
    .filter(Boolean);
  return `/${parts.join("/")}`;
}

function isGroup(segment: string): boolean {
  return segment.startsWith("(") && segment.endsWith(")");
}

function isIgnoredSegment(segment: string): boolean {
  return isGroup(segment);
}

function toUnix(input: string): string {
  return input.split(path.sep).join("/");
}

