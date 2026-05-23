import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const dryRun = process.argv.includes("--dry-run");

const packages = [
  "runtime",
  "router",
  "compiler",
  "fanxipan-node",
  "fanxipan",
  "vite-plugin-fanxipan",
  "create-fanxipan",
];

const packageMeta = new Map();
for (const dir of packages) {
  const pkgPath = path.join("packages", dir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  packageMeta.set(pkg.name, { dir, pkg });
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

const tmpRoot = path.join(".tmp", "stable-publish");
rmSync(tmpRoot, { recursive: true, force: true });
mkdirSync(tmpRoot, { recursive: true });
mkdirSync(path.join(".tmp", "npm-cache"), { recursive: true });

const versionMap = new Map();
for (const [pkgName, meta] of packageMeta.entries()) {
  versionMap.set(pkgName, meta.pkg.version);
}

for (const [pkgName, meta] of packageMeta.entries()) {
  const sourceDir = path.join("packages", meta.dir);
  const targetDir = path.join(tmpRoot, meta.dir);
  cpSync(sourceDir, targetDir, {
    recursive: true,
    filter: (src) => !src.includes(`${path.sep}node_modules${path.sep}`),
  });

  const pkgPath = path.join(targetDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  rewriteDepsField(pkg, "dependencies", versionMap);
  rewriteDepsField(pkg, "devDependencies", versionMap);
  rewriteDepsField(pkg, "peerDependencies", versionMap);
  rewriteDepsField(pkg, "optionalDependencies", versionMap);
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

  const args = ["publish", "--tag", "latest", "--access", "public"];
  if (dryRun) args.push("--dry-run");
  else args.push("--provenance");

  if (!existsSync(path.join(targetDir, "package.json"))) {
    throw new Error(`Missing package.json for ${pkgName} at ${targetDir}`);
  }
  console.log(`[stable] publishing ${pkgName}@${pkg.version} (${dryRun ? "dry-run" : "live"})`);
  run("npm", args, targetDir);
}

console.log(`[stable] completed ${dryRun ? "dry-run" : "live"} stable publish`);
