import { createRouteRecord, normalizePath } from "./route-record.js";
import type { RouteConfig, RouteRecord, RouteTreeNode } from "./types.js";

export function normalizeRoutes(config: RouteConfig): RouteRecord[] {
  const out: RouteRecord[] = [];
  walkConfig(config, "", [], false, out);
  return out.sort((a, b) => b.score - a.score);
}

function walkConfig(
  config: RouteConfig | RouteTreeNode,
  basePath: string,
  parentLayouts: unknown[],
  inheritedBreakout: boolean,
  out: RouteRecord[]
): void {
  for (const [key, value] of Object.entries(config)) {
    if (key === "layout") continue;
    if (key === "/" && basePath) continue;
    const { segment, breakout } = unwrapSegment(key);
    const nextBreakout = inheritedBreakout || breakout;
    const effectiveLayouts = nextBreakout ? [] : parentLayouts;
    const absolutePath = joinRoutePath(basePath, segment);

    if (isRouteNode(value)) {
      const childLayout = value.layout;
      const childLayouts = childLayout ? [...effectiveLayouts, childLayout] : effectiveLayouts;
      const indexComp = value["/"];
      if (isRouteComponent(indexComp)) {
        out.push(
          createRouteRecord({
            path: absolutePath,
            component: indexComp,
            layouts: childLayouts,
            breakout: nextBreakout,
          })
        );
      }
      walkConfig(value, absolutePath, childLayouts, nextBreakout, out);
      continue;
    }

    if (isRouteComponent(value)) {
      out.push(
        createRouteRecord({
          path: absolutePath,
          component: value,
          layouts: effectiveLayouts,
          breakout: nextBreakout,
        })
      );
      continue;
    }

  }
}

function unwrapSegment(raw: string): { segment: string; breakout: boolean } {
  if (raw.startsWith("/(") && raw.endsWith(")")) {
    const inner = raw.slice(2, -1);
    return { segment: `/${inner}`, breakout: true };
  }
  return { segment: raw, breakout: false };
}

function joinRoutePath(basePath: string, segment: string): string {
  if (segment === "/" && !basePath) return "/";
  if (segment === "/") return normalizePath(basePath);
  return normalizePath(`${normalizePath(basePath || "/")}/${segment.replace(/^\//, "")}`);
}

function isRouteNode(value: unknown): value is RouteTreeNode {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.includes("layout") || keys.some((k) => k.startsWith("/"));
}

function isRouteComponent(value: unknown): boolean {
  return typeof value === "function" || (typeof value === "object" && value !== null && !isRouteNode(value));
}
