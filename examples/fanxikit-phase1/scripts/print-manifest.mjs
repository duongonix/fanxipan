import path from "node:path";
import { createRouteManifest } from "fanxikit";

const root = path.resolve(process.cwd());
const manifest = createRouteManifest(root);
console.log(JSON.stringify(manifest, null, 2));


