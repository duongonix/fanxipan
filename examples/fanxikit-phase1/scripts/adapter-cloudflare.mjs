import path from "node:path";
import adapterCloudflare from "fanxi-adapter-cloudflare";
import { createRouteManifest } from "fanxikit";

const root = path.resolve(process.cwd());
const manifest = createRouteManifest(root);
const adapter = adapterCloudflare();
await adapter.adapt({
  outDir: path.join(root, ".fanxikit", "cloudflare"),
  serverEntry: "src/server.ts",
  manifest,
});

console.log("adapter-cloudflare complete");
