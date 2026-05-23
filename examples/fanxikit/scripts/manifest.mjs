import { createRouteManifest, validateRouteManifest } from "fanxikit";

const manifest = createRouteManifest(process.cwd());
const diagnostics = validateRouteManifest(manifest);
console.log(JSON.stringify({ routes: manifest.entries, diagnostics }, null, 2));
