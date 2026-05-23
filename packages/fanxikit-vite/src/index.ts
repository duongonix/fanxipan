import path from "node:path";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRouteManifest } from "fanxikit";
import type { Plugin } from "vite";

const VIRTUAL_MANIFEST_ID = "virtual:fanxikit/manifest";
const RESOLVED_VIRTUAL_MANIFEST_ID = "\0virtual:fanxikit/manifest";
const VIRTUAL_TYPES_ID = "virtual:fanxikit/types";
const RESOLVED_VIRTUAL_TYPES_ID = "\0virtual:fanxikit/types";

export function fanxikitVitePlugin(): Plugin {
  let root = process.cwd();
  let latestManifest = createRouteManifest(root);

  const refreshArtifacts = () => {
    latestManifest = createRouteManifest(root);
    generateRouteTypes(root, latestManifest);
  };

  return {
    name: "fanxikit-vite",
    configResolved(config) {
      root = config.root;
      refreshArtifacts();
    },
    buildStart() {
      refreshArtifacts();
    },
    resolveId(id) {
      if (id === VIRTUAL_MANIFEST_ID) return RESOLVED_VIRTUAL_MANIFEST_ID;
      if (id === VIRTUAL_TYPES_ID) return RESOLVED_VIRTUAL_TYPES_ID;
      return null;
    },
    load(id) {
      if (id === RESOLVED_VIRTUAL_MANIFEST_ID) {
        return `export default ${JSON.stringify(latestManifest)};`;
      }
      if (id === RESOLVED_VIRTUAL_TYPES_ID) {
        return "export const generated = true; export default generated;";
      }
      return null;
    },
    handleHotUpdate(ctx) {
      const rel = path.relative(root, ctx.file).split(path.sep).join("/");
      if (!rel.startsWith("src/routes/")) return;
      refreshArtifacts();
      for (const id of [RESOLVED_VIRTUAL_MANIFEST_ID, RESOLVED_VIRTUAL_TYPES_ID]) {
        const mod = ctx.server.moduleGraph.getModuleById(id);
        if (mod) ctx.server.moduleGraph.invalidateModule(mod);
      }
      ctx.server.ws.send({
        type: "custom",
        event: "fanxikit:manifest-update",
        data: { routes: latestManifest.entries.map((x) => x.id) },
      });
      ctx.server.ws.send({
        type: "custom",
        event: "fanxikit:devtools",
        data: {
          type: "manifest-update",
          routes: latestManifest.entries.length,
          at: Date.now(),
        },
      });
      ctx.server.ws.send({ type: "full-reload", path: "*" });
    },
    configureServer(server) {
      server.ws.send({
        type: "custom",
        event: "fanxikit:devtools",
        data: {
          type: "server-ready",
          routes: latestManifest.entries.length,
          at: Date.now(),
        },
      });
    },
  };
}

export default fanxikitVitePlugin;

function generateRouteTypes(root: string, manifest: { entries: Array<{ id: string; path: string }> }) {
  const outDir = path.resolve(root, ".fanxikit/types");
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  for (const entry of manifest.entries) {
    const relDir = entry.id === "/" ? "root" : entry.id.slice(1);
    const absDir = path.resolve(outDir, relDir);
    mkdirSync(absDir, { recursive: true });
    const params = extractParams(entry.path);
    const paramsType =
      params.length === 0 ? "Record<string, never>" : `{ ${params.map((x) => `${x}: string`).join("; ")} }`;
    const content = [
      `export type RouteId = ${JSON.stringify(entry.id)};`,
      `export type RouteParams = ${paramsType};`,
      "export interface LayoutData extends Record<string, unknown> {}",
      "export interface PageData extends Record<string, unknown> {}",
      "export interface ActionData extends Record<string, unknown> {}",
      "export interface EndpointData extends Record<string, unknown> {}",
      "",
    ].join("\n");
    writeFileSync(path.join(absDir, "$types.d.ts"), content, "utf8");
  }
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


