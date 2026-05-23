import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface NetlifyBuilderLike {
  outDir: string;
  serverEntry?: string;
  clientEntry?: string;
  manifest?: unknown;
}

export interface NetlifyAdapter {
  name: "fanxi-adapter-netlify";
  adapt(builder: NetlifyBuilderLike): Promise<void>;
}

export default function adapterNetlify(): NetlifyAdapter {
  return {
    name: "fanxi-adapter-netlify",
    async adapt(builder: NetlifyBuilderLike) {
      const outDir = path.resolve(builder.outDir);
      mkdirSync(outDir, { recursive: true });
      writeFileSync(
        path.join(outDir, "_redirects"),
        "/* /.netlify/functions/server 200\n",
        "utf8"
      );
      writeFileSync(
        path.join(outDir, "adapter-manifest.json"),
        JSON.stringify(
          {
            adapter: "fanxi-adapter-netlify",
            generatedAt: new Date().toISOString(),
            serverEntry: builder.serverEntry ?? null,
            clientEntry: builder.clientEntry ?? null,
            capabilities: {
              streaming: true,
              edge: true,
            },
            manifest: builder.manifest ?? null,
          },
          null,
          2
        ),
        "utf8"
      );
    },
  };
}
