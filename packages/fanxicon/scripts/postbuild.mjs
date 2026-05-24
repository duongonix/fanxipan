import { cpSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(here, "..", "dist");

function walk(dir) {
  for (const item of readdirSync(dir)) {
    const full = path.join(dir, item);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
      continue;
    }
    if (full.endsWith(".js")) {
      cpSync(full, full.replace(/\.js$/, ".cjs"));
    }
  }
}

walk(distDir);
console.log("[fanxicon] wrote .cjs files");

