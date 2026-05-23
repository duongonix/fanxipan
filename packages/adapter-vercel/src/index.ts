import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface VercelBuilderLike {
  outDir: string;
  serverEntry?: string;
  clientEntry?: string;
  manifest?: unknown;
}

export interface VercelAdapter {
  name: "fanxi-adapter-vercel";
  adapt(builder: VercelBuilderLike): Promise<void>;
}

export default function adapterVercel(): VercelAdapter {
  return {
    name: "fanxi-adapter-vercel",
    async adapt(builder: VercelBuilderLike) {
      const outDir = path.resolve(builder.outDir);
      mkdirSync(outDir, { recursive: true });
      writeFileSync(
        path.join(outDir, "config.json"),
        JSON.stringify(
          {
            version: 3,
            cleanUrls: true,
            trailingSlash: false,
          },
          null,
          2
        ),
        "utf8"
      );
      writeFileSync(
        path.join(outDir, "adapter-manifest.json"),
        JSON.stringify(
          {
            adapter: "fanxi-adapter-vercel",
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
