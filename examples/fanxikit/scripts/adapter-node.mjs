import path from "node:path";
import adapterNode from "fanxi-adapter-node";
import { createRouteManifest } from "fanxikit";

const root = process.cwd();
const manifest = createRouteManifest(root);
await adapterNode().adapt({
  root,
  outDir: path.join(root, ".fanxikit-node"),
  manifest,
});
console.log("fanxi-adapter-node output created");
