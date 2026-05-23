import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { resolveRouteRenderMode } from "./modes.js";
import { renderHtmlShell } from "./render.js";
import type { RouteManifest } from "./types.js";

export interface PrerenderOptions {
  outDir: string;
  entries?: string[];
  defaults?: {
    ssr?: boolean;
    csr?: boolean;
    prerender?: boolean;
  };
  spaFallback?: string;
}

export interface PrerenderedPage {
  path: string;
  file: string;
}

export function prerenderRoutes(manifest: RouteManifest, options: PrerenderOptions): PrerenderedPage[] {
  const outDir = path.resolve(options.outDir);
  mkdirSync(outDir, { recursive: true });
  const pages: PrerenderedPage[] = [];

  for (const entry of manifest.entries) {
    if (!entry.files.some((f) => f.kind === "page")) continue;
    if (entry.path.includes(":") || entry.path.includes("*")) continue;
    const routeMode = resolveRouteRenderMode(manifest, entry, options.defaults);
    const shouldPrerender = routeMode.prerender || options.entries?.includes(entry.path);
    if (!shouldPrerender) continue;
    const url = new URL(`http://localhost${entry.path}`);
    const html = renderHtmlShell({
      url,
      manifest,
      data: {},
      status: 200,
    });
    const file = toHtmlFile(outDir, entry.path);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, html, "utf8");
    pages.push({ path: entry.path, file });
  }

  if (options.spaFallback) {
    const html = renderHtmlShell({
      url: new URL("http://localhost/"),
      manifest,
      data: {},
      status: 200,
    });
    const file = path.resolve(outDir, options.spaFallback);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, html, "utf8");
    pages.push({ path: "*", file });
  }

  return pages;
}

function toHtmlFile(outDir: string, routePath: string): string {
  if (routePath === "/") return path.resolve(outDir, "index.html");
  const rel = routePath.replace(/^\//, "");
  return path.resolve(outDir, rel, "index.html");
}
