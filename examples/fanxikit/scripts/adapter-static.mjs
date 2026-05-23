import path from "node:path";
import adapterStatic from "fanxi-adapter-static";
import { createRouteManifest } from "fanxikit";

const root = process.cwd();
const manifest = createRouteManifest(root);
await adapterStatic().adapt({
  root,
  outDir: path.join(root, ".fanxikit-static"),
  manifest,
  spaFallback: "200.html",
});
console.log("fanxi-adapter-static output created");
