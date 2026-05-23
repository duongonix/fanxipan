import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRouteManifest } from "./manifest.js";
import { prerenderRoutes, type PrerenderedPage } from "./prerender.js";
import { generateRouteTypes } from "./typegen.js";
import { validateRouteManifest, throwIfDiagnostics } from "./diagnostics.js";
import type { RouteManifest } from "./types.js";

export interface BuildOptions {
  root: string;
  outDir?: string;
  routesDir?: string;
  staticDir?: string;
  prerenderEntries?: string[];
  spaFallback?: string;
}

export interface BuildOutput {
  outDir: string;
  manifest: RouteManifest;
  prerendered: PrerenderedPage[];
}

export function buildFanxiKitApp(options: BuildOptions): BuildOutput {
  const root = path.resolve(options.root);
  const outDir = path.resolve(root, options.outDir ?? ".fanxikit");
  const manifest = createRouteManifest(root, options.routesDir);
  throwIfDiagnostics(validateRouteManifest(manifest));

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  mkdirSync(path.join(outDir, "client"), { recursive: true });
  mkdirSync(path.join(outDir, "server"), { recursive: true });
  mkdirSync(path.join(outDir, "prerendered"), { recursive: true });
  mkdirSync(path.join(outDir, "types"), { recursive: true });

  copyStatic(root, options.staticDir ?? "static", path.join(outDir, "client"));
  const prerendered = prerenderRoutes(manifest, {
    outDir: path.join(outDir, "prerendered"),
    entries: options.prerenderEntries,
    spaFallback: options.spaFallback,
  });
  generateRouteTypes(root, manifest, path.join(outDir, "types"));

  writeFileSync(path.join(outDir, "routes.json"), JSON.stringify(manifest, null, 2), "utf8");
  writeFileSync(
    path.join(outDir, "manifest.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        routes: manifest.entries.length,
        prerendered,
      },
      null,
      2
    ),
    "utf8"
  );

  return { outDir, manifest, prerendered };
}

function copyStatic(root: string, staticDir: string, outDir: string) {
  const source = path.resolve(root, staticDir);
  if (!existsSync(source)) return;
  copyDir(source, outDir);
}

function copyDir(source: string, target: string) {
  mkdirSync(target, { recursive: true });
  for (const item of readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, item.name);
    const to = path.join(target, item.name);
    if (item.isDirectory()) copyDir(from, to);
    else if (item.isFile()) copyFileSync(from, to);
  }
}
