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

const rootPkg = JSON.parse(readFileSync("package.json", "utf8"));
const sha = (process.env.GITHUB_SHA || "localdev").slice(0, 7);
const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 12);
const canaryVersion =
  process.env.CANARY_VERSION || `${rootPkg.version}-canary.${stamp}.${sha}`;

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
      console.log(`[canary] skip private package ${pkg.name} (${relDir})`);
      continue;
    }
    items.push({ relDir, pkg });
  }
  return items;
}

function rewriteDepsField(obj, field, allNames) {
  if (!obj[field]) return;
  for (const name of Object.keys(obj[field])) {
    const current = obj[field][name];
    if (allNames.has(name)) {
      obj[field][name] = canaryVersion;
      continue;
    }
    if (typeof current === "string" && current.startsWith("workspace:")) {
      if (current === "workspace:*") {
        throw new Error(
          `Cannot publish canary: dependency ${name} uses workspace:* but is not in publish set.`,
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
      throw new Error(`[canary] missing publish artifact for ${pkg.name}: ${rel}`);
    }
  }
}

if (!skipPreflight) {
  console.log("[canary] running preflight checks...");
  run("pnpm", ["run", "build:core"]);
  run("pnpm", ["--filter", "@fanxipan/node", "build"]);
  run("pnpm", ["--filter", "create-fanxipan", "build"]);
  run("pnpm", ["run", "test:fanxipan"]);
  run("pnpm", ["run", "check:api-contract"]);
}

const packages = loadPackages();
console.log("[canary] publish order:");
for (const { pkg } of packages) {
  console.log(`  - ${pkg.name}@${canaryVersion}`);
}

const tmpRoot = path.join(".tmp", "canary-publish");
rmSync(tmpRoot, { recursive: true, force: true });
mkdirSync(tmpRoot, { recursive: true });
mkdirSync(path.join(".tmp", "npm-cache"), { recursive: true });

const allNames = new Set(packages.map((x) => x.pkg.name));

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
  mutablePkg.version = canaryVersion;
  rewriteDepsField(mutablePkg, "dependencies", allNames);
  rewriteDepsField(mutablePkg, "devDependencies", allNames);
  rewriteDepsField(mutablePkg, "peerDependencies", allNames);
  rewriteDepsField(mutablePkg, "optionalDependencies", allNames);
  writeFileSync(pkgPath, `${JSON.stringify(mutablePkg, null, 2)}\n`, "utf8");

  const args = ["publish", "--tag", "canary", "--access", "public"];
  if (dryRun) args.push("--dry-run");
  else args.push("--provenance");

  console.log(
    `[canary] publishing ${mutablePkg.name}@${canaryVersion} (${dryRun ? "dry-run" : "live"})`,
  );
  run("npm", args, targetDir);
}

console.log(`[canary] completed ${dryRun ? "dry-run" : "live"} publish for ${canaryVersion}`);
