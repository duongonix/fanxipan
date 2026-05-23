import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const checks = [
  {
    name: "compiler",
    src: "packages/compiler/src",
    dist: "packages/compiler/dist",
  },
  {
    name: "runtime",
    src: "packages/runtime/src",
    dist: "packages/runtime/dist",
  },
  {
    name: "vite-plugin-fanxipan",
    src: "packages/vite-plugin-fanxipan/src",
    dist: "packages/vite-plugin-fanxipan/dist",
  },
  {
    name: "fanxipan",
    src: "packages/fanxipan/src",
    dist: "packages/fanxipan/dist",
  },
];

function latestMtimeMs(dir) {
  let latest = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        const mtimeMs = statSync(full).mtimeMs;
        if (mtimeMs > latest) latest = mtimeMs;
      }
    }
  }
  return latest;
}

let failed = false;
for (const check of checks) {
  if (!existsSync(check.src)) continue;
  if (!existsSync(check.dist)) {
    console.error(`[doctor] Missing dist for ${check.name}: ${check.dist}`);
    failed = true;
    continue;
  }
  const srcLatest = latestMtimeMs(check.src);
  const distLatest = latestMtimeMs(check.dist);
  if (srcLatest > distLatest) {
    console.error(
      `[doctor] Stale dist for ${check.name}. src newer than dist. Run: pnpm run build:core`,
    );
    failed = true;
  }
}

if (!existsSync("packages/fanxipan-node/index.js")) {
  console.error("[doctor] Missing native bridge entry: packages/fanxipan-node/index.js");
  failed = true;
}

if (failed) process.exit(1);
console.log("[doctor] Core build artifacts are in sync.");
