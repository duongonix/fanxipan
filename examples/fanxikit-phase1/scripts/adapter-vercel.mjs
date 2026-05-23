import path from "node:path";
import adapterVercel from "fanxi-adapter-vercel";
import { createRouteManifest } from "fanxikit";

const root = path.resolve(process.cwd());
const manifest = createRouteManifest(root);
const adapter = adapterVercel();
await adapter.adapt({
  outDir: path.join(root, ".fanxikit", "vercel"),
  serverEntry: "src/server.ts",
  clientEntry: "src/client.ts",
  manifest,
});

console.log("adapter-vercel complete");
