import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const packagesDir = path.join(root, "packages");
const offenders = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
      continue;
    }
    if (!full.endsWith(".ts")) continue;
    if (!full.includes(`${path.sep}src${path.sep}`)) continue;
    if (full.endsWith(".test.ts")) continue;
    checkFile(full);
  }
}

function checkFile(file) {
  const src = readFileSync(file, "utf8");
  const lines = src.split(/\r?\n/);
  lines.forEach((line, idx) => {
    const m = line.match(/from\s+["'](\.{1,2}\/[^"']+)["']/);
    if (!m) return;
    const spec = m[1];
    if (spec.endsWith(".js") || spec.endsWith(".json") || spec.endsWith(".fanxi")) return;
    offenders.push(`${path.relative(root, file)}:${idx + 1}: ${spec}`);
  });
}

walk(packagesDir);

if (offenders.length > 0) {
  console.error("[esm-import-check] Found relative imports without .js extension:");
  for (const entry of offenders) console.error(`  - ${entry}`);
  process.exit(1);
}

console.log("[esm-import-check] OK");
