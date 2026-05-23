import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface BuilderLike {
  root?: string;
  outDir: string;
  serverEntry?: string;
  clientEntry?: string;
  manifest?: unknown;
  capabilities?: {
    streaming?: boolean;
    edge?: boolean;
  };
}

export interface NodeAdapter {
  name: "fanxi-adapter-node";
  adapt(builder: BuilderLike): Promise<void>;
}

export default function adapterNode(): NodeAdapter {
  return {
    name: "fanxi-adapter-node",
    async adapt(builder: BuilderLike) {
      const outDir = path.resolve(builder.outDir);
      mkdirSync(outDir, { recursive: true });

      const bootstrapFile = path.join(outDir, "server.js");
      const source = [
        "import { createServer } from 'node:http';",
        "import { createRouteManifest, createSsrApp, renderHtmlShell } from 'fanxikit';",
        "",
        `const root = ${JSON.stringify(path.resolve(builder.root ?? process.cwd()))};`,
        "export function createHandler() {",
        "  const manifest = createRouteManifest(root);",
        "  const app = createSsrApp(manifest, ({ url, manifest, data, serialized, head, css }) =>",
        "    renderHtmlShell({ url, manifest, data, serialized, head, css })",
        "  );",
        "  return async function handle(req, res) {",
        "    const host = req.headers.host || 'localhost';",
        "    const url = new URL(req.url || '/', `http://${host}`);",
        "    const response = await app.handleRequest(new Request(url, { method: req.method, headers: req.headers }));",
        "    res.statusCode = response.status;",
        "    for (const [key, value] of response.headers.entries()) res.setHeader(key, value);",
        "    if (!response.body) return res.end();",
        "    const reader = response.body.getReader();",
        "    while (true) {",
        "      const { done, value } = await reader.read();",
        "      if (done) break;",
        "      if (value) res.write(Buffer.from(value));",
        "    }",
        "    res.end();",
        "  };",
        "}",
        "",
        "export async function start({ port = Number(process.env.PORT || 3000) } = {}) {",
        "  const server = createServer(createHandler());",
        "  await new Promise((resolve) => server.listen(port, resolve));",
        "  return server;",
        "}",
        "",
        "if (import.meta.url === `file://${process.argv[1]}`) {",
        "  start().then((server) => {",
        "    const address = server.address();",
        "    const port = typeof address === 'object' && address ? address.port : process.env.PORT || 3000;",
        "    console.log(`fanxikit node server listening at http://localhost:${port}`);",
        "  });",
        "}",
        "",
      ].join("\n");
      writeFileSync(bootstrapFile, source, "utf8");

      writeFileSync(
        path.join(outDir, "adapter-manifest.json"),
        JSON.stringify(
          {
            adapter: "fanxi-adapter-node",
            generatedAt: new Date().toISOString(),
            serverEntry: builder.serverEntry ?? null,
            clientEntry: builder.clientEntry ?? null,
            capabilities: {
              streaming: builder.capabilities?.streaming ?? true,
              edge: builder.capabilities?.edge ?? false,
            },
            routeManifest: builder.manifest ?? null,
          },
          null,
          2
        ),
        "utf8"
      );
    },
  };
}


