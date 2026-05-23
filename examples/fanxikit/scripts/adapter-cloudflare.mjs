import path from "node:path";
import adapterCloudflare from "fanxi-adapter-cloudflare";
import { createRouteManifest } from "fanxikit";

const root = process.cwd();
const manifest = createRouteManifest(root);
await adapterCloudflare().adapt({
  outDir: path.join(root, ".fanxikit-cloudflare"),
  manifest,
});
console.log("fanxi-adapter-cloudflare output created");
