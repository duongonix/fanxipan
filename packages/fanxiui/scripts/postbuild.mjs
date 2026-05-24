import { cpSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const dist = path.resolve("dist");
function walk(dir) {
  for (const item of readdirSync(dir)) {
    const full = path.join(dir, item);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (full.endsWith(".js")) cpSync(full, full.replace(/\.js$/, ".cjs"));
  }
}
walk(dist);

