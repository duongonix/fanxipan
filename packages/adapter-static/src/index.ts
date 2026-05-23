import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prerenderRoutes } from "fanxikit";
import type { RouteManifest } from "fanxikit";

export interface StaticBuilderLike {
  root: string;
  outDir: string;
  manifest: RouteManifest;
  spaFallback?: string;
  prerenderEntries?: string[];
}

export interface StaticAdapter {
  name: "fanxi-adapter-static";
  adapt(builder: StaticBuilderLike): Promise<void>;
}

export default function adapterStatic(): StaticAdapter {
  return {
    name: "fanxi-adapter-static",
    async adapt(builder: StaticBuilderLike) {
      const outDir = path.resolve(builder.outDir);
      mkdirSync(outDir, { recursive: true });
      const pages = prerenderRoutes(builder.manifest, {
        outDir,
        entries: builder.prerenderEntries,
        spaFallback: builder.spaFallback,
      });
      writeFileSync(
        path.join(outDir, "prerender-manifest.json"),
        JSON.stringify(
          {
            adapter: "fanxi-adapter-static",
            generatedAt: new Date().toISOString(),
            pages,
          },
          null,
          2
        ),
        "utf8"
      );
    },
  };
}
