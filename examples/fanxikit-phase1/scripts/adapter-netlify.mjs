import path from "node:path";
import adapterNetlify from "fanxi-adapter-netlify";
import { createRouteManifest } from "fanxikit";

const root = path.resolve(process.cwd());
const manifest = createRouteManifest(root);
const adapter = adapterNetlify();
await adapter.adapt({
  outDir: path.join(root, ".fanxikit", "netlify"),
  serverEntry: "src/server.ts",
  clientEntry: "src/client.ts",
  manifest,
});

console.log("adapter-netlify complete");
