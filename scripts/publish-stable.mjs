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

if (!skipPreflight) {
  console.log("[stable] running preflight checks...");
  run("pnpm", ["run", "build:core"]);
  run("pnpm", ["run", "test:fanxipan"]);
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
  run("npm", args, targetDir);
}

console.log(`[stable] completed ${dryRun ? "dry-run" : "live"} stable publish`);
