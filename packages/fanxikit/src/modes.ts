import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { RouteFileRef, RouteManifest, RouteManifestEntry } from "./types.js";

export interface RouteRenderMode {
  ssr: boolean;
  csr: boolean;
  prerender: boolean;
}

export function resolveRouteRenderMode(
  manifest: RouteManifest,
  entry: RouteManifestEntry,
  defaults: Partial<RouteRenderMode> = {}
): RouteRenderMode {
  const chain = resolveLayoutChain(manifest, entry);
  const mode: RouteRenderMode = {
    ssr: defaults.ssr ?? true,
    csr: defaults.csr ?? true,
    prerender: defaults.prerender ?? false,
  };

  for (const route of chain) {
    for (const file of route.files) {
      if (!isConfigCarrier(file.kind)) continue;
      const abs = path.resolve(manifest.root, manifest.routesDir, file.file);
      if (!existsSync(abs)) continue;
      const src = readFileSync(abs, "utf8");
      const next = parseModeFromSource(src);
      if (typeof next.ssr === "boolean") mode.ssr = next.ssr;
      if (typeof next.csr === "boolean") mode.csr = next.csr;
      if (typeof next.prerender === "boolean") mode.prerender = next.prerender;
    }
  }
  return mode;
}

function resolveLayoutChain(manifest: RouteManifest, entry: RouteManifestEntry): RouteManifestEntry[] {
  const out: RouteManifestEntry[] = [];
  for (let i = 0; i <= entry.segments.length; i += 1) {
    const id = i === 0 ? "/" : `/${entry.segments.slice(0, i).join("/")}`;
    const found = manifest.entries.find((x) => x.id === id);
    if (found) out.push(found);
  }
  return out;
}

function isConfigCarrier(kind: RouteFileRef["kind"]): boolean {
  return kind === "layout-load" || kind === "layout-server" || kind === "page-load" || kind === "page-server";
}

function parseModeFromSource(source: string): Partial<RouteRenderMode> {
  return {
    ssr: parseBooleanExport(source, "ssr"),
    csr: parseBooleanExport(source, "csr"),
    prerender: parseBooleanExport(source, "prerender"),
  };
}

function parseBooleanExport(source: string, name: string): boolean | undefined {
  const rx = new RegExp(`export\\s+const\\s+${name}\\s*=\\s*(true|false)\\s*;?`);
  const match = source.match(rx);
  if (!match) return undefined;
  return match[1] === "true";
}
