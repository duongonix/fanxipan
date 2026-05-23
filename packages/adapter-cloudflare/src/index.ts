import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface CloudflareBuilderLike {
  outDir: string;
  serverEntry?: string;
  manifest?: unknown;
  capabilities?: {
    streaming?: boolean;
  };
}

export interface CloudflareAdapter {
  name: "fanxi-adapter-cloudflare";
  adapt(builder: CloudflareBuilderLike): Promise<void>;
}

export default function adapterCloudflare(): CloudflareAdapter {
  return {
    name: "fanxi-adapter-cloudflare",
    async adapt(builder: CloudflareBuilderLike) {
      const outDir = path.resolve(builder.outDir);
      mkdirSync(outDir, { recursive: true });
      const workerFile = path.join(outDir, "worker.js");
      const source = [
        "/* fanxikit Cloudflare adapter entry. Bundle this file with your worker build. */",
        "export default {",
        "  async fetch(request, env, ctx) {",
        "    return new Response('fanxikit cloudflare adapter entry generated', { status: 200 });",
        "  }",
        "};",
        "",
      ].join("\n");
      writeFileSync(workerFile, source, "utf8");
      writeFileSync(
        path.join(outDir, "manifest.json"),
        JSON.stringify(
          {
            adapter: "fanxi-adapter-cloudflare",
            generatedAt: new Date().toISOString(),
            serverEntry: builder.serverEntry ?? null,
            capabilities: {
              streaming: builder.capabilities?.streaming ?? true,
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
