import path from "node:path";
import adapterNode from "fanxi-adapter-node";
import { createRouteManifest } from "fanxikit";

const root = path.resolve(process.cwd());
const manifest = createRouteManifest(root);
const adapter = adapterNode();

await adapter.adapt({
  outDir: path.join(root, ".fanxikit-output"),
  manifest,
});

console.log("adapter-node skeleton output created in .fanxikit-output");


