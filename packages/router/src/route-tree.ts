import type { RouteConfig, RouteTreeNode } from "./types.js";

export function isTreeNode(value: unknown): value is RouteTreeNode {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isRouteConfig(value: unknown): value is RouteConfig {
  return isTreeNode(value);
}
