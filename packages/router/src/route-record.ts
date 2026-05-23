import type { RouteRecord } from "./types.js";

export function isCatchAllPath(path: string): boolean {
  return path === "*" || path === "/*" || /^\*[\w-]+$/.test(path) || /^\(\*[\w-]+\)$/.test(path);
}

export function createRouteRecord(input: {
  path: string;
  component: unknown;
  layouts: unknown[];
  breakout: boolean;
}): RouteRecord {
  const { regex, params, catchAll } = compilePath(input.path);
  const dedupedLayouts = dedupeLayouts(input.layouts);
  return {
    path: input.path,
    component: input.component,
    layouts: dedupedLayouts,
    regex,
    params,
    catchAll,
    breakout: input.breakout,
    score: scorePath(input.path, catchAll),
  };
}

function dedupeLayouts(layouts: unknown[]): unknown[] {
  const out: unknown[] = [];
  const keys: string[] = [];
  for (const layout of layouts) {
    const key = layoutKey(layout);
    if (keys.length > 0 && keys[keys.length - 1] === key) continue;
    out.push(layout);
    keys.push(key);
  }
  return out;
}

function layoutKey(layout: unknown): string {
  if (typeof layout === "function") {
    return `fn:${layout.name || "anonymous"}`;
  }
  if (layout && typeof layout === "object") {
    const name = (layout as any).name;
    if (typeof name === "string" && name.length > 0) {
      return `obj:${name}`;
    }
  }
  return String(layout);
}

export function compilePath(path: string): { regex: RegExp; params: string[]; catchAll: boolean } {
  if (isCatchAllPath(path)) {
    return { regex: /^\/.*$/, params: [], catchAll: true };
  }
  const params: string[] = [];
  const segments = normalizePath(path).split("/").filter(Boolean);
  const parts = segments.map((segment) => {
    if (segment.startsWith(":")) {
      params.push(segment.slice(1));
      return "([^/]+)";
    }
    if (segment.startsWith("*")) {
      const name = segment.slice(1);
      if (name) params.push(name);
      return "(.*)";
    }
    return escapeRegExp(segment);
  });
  const source = `^/${parts.join("/")}${parts.length === 0 ? "" : ""}/?$`;
  return {
    regex: new RegExp(source),
    params,
    catchAll: false,
  };
}

export function normalizePath(path: string): string {
  if (!path) return "/";
  let out = path.trim();
  if (!out.startsWith("/")) out = `/${out}`;
  out = out.replace(/\/{2,}/g, "/");
  if (out.length > 1 && out.endsWith("/")) out = out.slice(0, -1);
  return out;
}

function scorePath(path: string, catchAll: boolean): number {
  if (catchAll) return -1;
  const segments = normalizePath(path).split("/").filter(Boolean);
  let score = 0;
  for (const segment of segments) {
    if (segment.startsWith(":")) score += 2;
    else if (segment.startsWith("*")) score += 1;
    else score += 4;
  }
  return score;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
