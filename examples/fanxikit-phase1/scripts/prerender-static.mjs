import path from "node:path";
import { createRouteManifest, prerenderRoutes } from "fanxikit";

const root = path.resolve(process.cwd());
const manifest = createRouteManifest(root);
const pages = prerenderRoutes(manifest, {
  outDir: path.join(root, ".fanxikit", "prerender"),
  spaFallback: "200.html",
});

console.log(JSON.stringify({ prerendered: pages }, null, 2));
