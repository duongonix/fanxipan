import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(here, "..");
const rawIconsDir = path.join(pkgRoot, "raw-icons");

function optimizeSvg(source) {
  return source
    .replace(/\r\n/g, "\n")
    .replace(/\s{2,}/g, " ")
    .replace(/>\s+</g, "><")
    .trim();
}

if (!existsSync(rawIconsDir)) {
  console.log("[fanxicon] raw-icons not found, skipping optimize step.");
  process.exit(0);
}

mkdirSync(rawIconsDir, { recursive: true });
const files = readdirSync(rawIconsDir).filter((f) => f.endsWith(".svg"));
for (const file of files) {
  const fullPath = path.join(rawIconsDir, file);
  const next = optimizeSvg(readFileSync(fullPath, "utf8"));
  writeFileSync(fullPath, `${next}\n`, "utf8");
}

console.log(`[fanxicon] optimized ${files.length} svg files`);

