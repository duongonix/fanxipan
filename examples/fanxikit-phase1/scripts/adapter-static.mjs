import path from "node:path";
import adapterStatic from "fanxi-adapter-static";
import { createRouteManifest } from "fanxikit";

const root = path.resolve(process.cwd());
const manifest = createRouteManifest(root);
const adapter = adapterStatic();
await adapter.adapt({
  root,
  outDir: path.join(root, ".fanxikit", "static"),
  manifest,
  spaFallback: "200.html",
});

console.log("adapter-static complete");
