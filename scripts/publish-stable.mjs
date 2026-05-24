import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const dryRun = process.argv.includes("--dry-run");
const skipPreflight = process.argv.includes("--skip-preflight");

const publishPlan = [
  "packages/runtime",
  "packages/router",
  "packages/compiler",
  "packages/fanxipan-node",
  "packages/fanxipan",
  "packages/vite-plugin-fanxipan",
  "packages/create-fanxipan",
];

function run(command, args, cwd = process.cwd()) {
  const res = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, npm_config_cache: path.resolve(".tmp", "npm-cache") },
  });
  if (res.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with code ${res.status}`);
  }
}

function runCapture(command, args, cwd = process.cwd()) {
  return spawnSync(command, args, {
    cwd,
    stdio: "pipe",
    shell: process.platform === "win32",
    encoding: "utf8",
    env: { ...process.env, npm_config_cache: path.resolve(".tmp", "npm-cache") },
  });
}

function loadPackages() {
  const items = [];
  for (const relDir of publishPlan) {
    const pkgPath = path.join(relDir, "package.json");
    if (!existsSync(pkgPath)) {
      throw new Error(`Missing package.json: ${pkgPath}`);
    }
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    if (pkg.private) {
      console.log(`[stable] skip private package ${pkg.name} (${relDir})`);
      continue;
    }
    items.push({ relDir, pkg });
  }
  return items;
}

function rewriteDepsField(obj, field, versionMap) {
  if (!obj[field]) return;
  for (const name of Object.keys(obj[field])) {
    const current = obj[field][name];
    if (versionMap.has(name)) {
      obj[field][name] = versionMap.get(name);
      continue;
    }
    if (typeof current === "string" && current.startsWith("workspace:")) {
      if (current === "workspace:*") {
        throw new Error(
          `Cannot publish stable: dependency ${name} uses workspace:* but is not in publish set.`,
        );
      }
      obj[field][name] = current.replace(/^workspace:/, "");
    }
  }
}

function assertPublishArtifacts(pkg, pkgDir) {
  const required = [];
  for (const key of ["main", "module", "types"]) {
    if (typeof pkg[key] === "string" && pkg[key].trim()) required.push(pkg[key]);
  }
  if (pkg.bin && typeof pkg.bin === "object") {
    for (const rel of Object.values(pkg.bin)) {
      if (typeof rel === "string" && rel.trim()) required.push(rel);
    }
  } else if (typeof pkg.bin === "string" && pkg.bin.trim()) {
    required.push(pkg.bin);
  }
  for (const rel of required) {
    const full = path.join(pkgDir, rel);
    if (!existsSync(full)) {
      throw new Error(`[stable] missing publish artifact for ${pkg.name}: ${rel}`);
    }
  }
}

function assertNodeLoaderShape() {
  const loaderPath = path.join("packages", "fanxipan-node", "index.js");
  if (!existsSync(loaderPath)) return;
  const src = readFileSync(loaderPath, "utf8");
  if (src.includes("fanxipan-node.")) {
    throw new Error(
      `[stable] invalid @fanxipan/node loader detected (${loaderPath}) - found legacy 'fanxipan-node.*.node' pattern. Expected 'index.*.node'.`,
    );
  }
}

function isPublished(name, version) {
  const res = runCapture("npm", ["view", `${name}@${version}`, "version"]);
  return res.status === 0;
}

if (!skipPreflight) {
  console.log("[stable] running preflight checks...");
  assertNodeLoaderShape();
  run("pnpm", ["run", "build:core"]);
  run("pnpm", ["--filter", "create-fanxipan", "build"]);
  run("pnpm", ["run", "test:fanxipan"]);
  run("pnpm", ["run", "check:esm-imports"]);
  run("pnpm", ["run", "check:api-contract"]);
  run("pnpm", ["run", "release:gate"]);
}

const packages = loadPackages();
console.log("[stable] publish order:");
for (const { pkg } of packages) {
  console.log(`  - ${pkg.name}@${pkg.version}`);
}

const tmpRoot = path.join(".tmp", "stable-publish");
rmSync(tmpRoot, { recursive: true, force: true });
mkdirSync(tmpRoot, { recursive: true });
mkdirSync(path.join(".tmp", "npm-cache"), { recursive: true });

const versionMap = new Map(packages.map((x) => [x.pkg.name, x.pkg.version]));

for (const { relDir, pkg } of packages) {
  const sourceDir = relDir;
  assertPublishArtifacts(pkg, sourceDir);
  const targetDir = path.join(tmpRoot, relDir.replace(/^packages[\\/]/, ""));
  cpSync(sourceDir, targetDir, {
    recursive: true,
    filter: (src) => !src.includes(`${path.sep}node_modules${path.sep}`),
  });

  const pkgPath = path.join(targetDir, "package.json");
  const mutablePkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  rewriteDepsField(mutablePkg, "dependencies", versionMap);
  rewriteDepsField(mutablePkg, "devDependencies", versionMap);
  rewriteDepsField(mutablePkg, "peerDependencies", versionMap);
  rewriteDepsField(mutablePkg, "optionalDependencies", versionMap);
  writeFileSync(pkgPath, `${JSON.stringify(mutablePkg, null, 2)}\n`, "utf8");

  const args = ["publish", "--tag", "latest", "--access", "public"];
  if (dryRun) args.push("--dry-run");
  else args.push("--provenance");

  console.log(
    `[stable] publishing ${mutablePkg.name}@${mutablePkg.version} (${dryRun ? "dry-run" : "live"})`,
  );
  if (!dryRun && isPublished(mutablePkg.name, mutablePkg.version)) {
    console.log(`[stable] skip already published ${mutablePkg.name}@${mutablePkg.version}`);
    continue;
  }
  run("npm", args, targetDir);
}

console.log(`[stable] completed ${dryRun ? "dry-run" : "live"} stable publish`);
