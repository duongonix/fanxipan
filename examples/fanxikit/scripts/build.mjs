import { buildFanxiKitApp, loadConfig } from "fanxikit";

const config = await loadConfig(process.cwd());
const output = buildFanxiKitApp({
  root: process.cwd(),
  outDir: config.outDir ?? ".fanxikit",
  prerenderEntries: config.prerender?.entries,
  spaFallback: typeof config.spa === "object" ? config.spa.fallback : undefined,
});

console.log(JSON.stringify({ outDir: output.outDir, routes: output.manifest.entries.length }, null, 2));
