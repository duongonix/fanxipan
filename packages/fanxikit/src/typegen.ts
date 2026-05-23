import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { RouteManifest } from "./types.js";

export interface TypegenResult {
  outDir: string;
  files: string[];
}

export function generateRouteTypes(root: string, manifest: RouteManifest, outDir = ".fanxikit/types"): TypegenResult {
  const absOut = path.resolve(root, outDir);
  rmSync(absOut, { recursive: true, force: true });
  mkdirSync(absOut, { recursive: true });
  const files: string[] = [];
  for (const entry of manifest.entries) {
    const relDir = entry.id === "/" ? "root" : entry.id.slice(1);
    const routeDir = path.resolve(absOut, relDir);
    mkdirSync(routeDir, { recursive: true });
    const fileAbs = path.join(routeDir, "$types.d.ts");
    const content = renderTypesForEntry(entry.id, entry.path);
    writeFileSync(fileAbs, content, "utf8");
    files.push(fileAbs);
  }
  const globalFile = path.join(absOut, "index.d.ts");
  writeFileSync(
    globalFile,
    [
      "export type RouteId = string;",
      "export interface fanxikitLoadEvent<TParams extends Record<string, string> = Record<string, string>> {",
      "  params: TParams;",
      "  url: URL;",
      "  route: { id: RouteId };",
      "}",
      "",
    ].join("\n"),
    "utf8"
  );
  files.push(globalFile);
  return { outDir: absOut, files };
}

function renderTypesForEntry(id: string, routePath: string): string {
  const params = extractParams(routePath);
  const paramsType =
    params.length === 0
      ? "Record<string, never>"
      : `{ ${params.map((name) => `${name}: string`).join("; ")} }`;
  return [
    `export type RouteId = ${JSON.stringify(id)};`,
    `export type RouteParams = ${paramsType};`,
    "export interface LayoutData extends Record<string, unknown> {}",
    "export interface PageData extends Record<string, unknown> {}",
    "export interface ActionData extends Record<string, unknown> {}",
    "export interface EndpointData extends Record<string, unknown> {}",
    "export type LayoutLoad = (event: { params: RouteParams; url: URL; parent: () => Promise<LayoutData> }) => Promise<LayoutData> | LayoutData;",
    "export type PageLoad = (event: { params: RouteParams; url: URL; parent: () => Promise<LayoutData & PageData> }) => Promise<PageData> | PageData;",
    "export type Actions = Record<string, (event: { params: RouteParams; url: URL; request: Request }) => Promise<ActionData> | ActionData>;",
    "export type RequestHandler = (event: { params: RouteParams; url: URL; request: Request }) => Promise<Response> | Response;",
    "",
  ].join("\n");
}

function extractParams(routePath: string): string[] {
  const out: string[] = [];
  for (const seg of routePath.split("/")) {
    if (!seg) continue;
    if (seg.startsWith(":")) out.push(seg.replace(/^:/, "").replace(/\?$/, ""));
    if (seg.startsWith("*")) out.push(seg.replace(/^\*/, "") || "rest");
  }
  return Array.from(new Set(out));
}
