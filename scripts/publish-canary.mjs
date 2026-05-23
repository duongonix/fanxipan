import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const dryRun = process.argv.includes("--dry-run");
const rootPkg = JSON.parse(readFileSync("package.json", "utf8"));
const sha = (process.env.GITHUB_SHA || "localdev").slice(0, 7);
const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 12);
const canaryVersion =
  process.env.CANARY_VERSION || `${rootPkg.version}-canary.${stamp}.${sha}`;

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
          `Cannot publish canary: dependency ${name} uses workspace:* but is not in canary set.`,
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

const tmpRoot = path.join(".tmp", "canary-publish");
rmSync(tmpRoot, { recursive: true, force: true });
mkdirSync(tmpRoot, { recursive: true });
mkdirSync(path.join(".tmp", "npm-cache"), { recursive: true });

const allNames = new Set([...packageMeta.keys()]);

for (const [pkgName, meta] of packageMeta.entries()) {
  const sourceDir = path.join("packages", meta.dir);
  const targetDir = path.join(tmpRoot, meta.dir);
  cpSync(sourceDir, targetDir, {
    recursive: true,
    filter: (src) => !src.includes(`${path.sep}node_modules${path.sep}`),
  });

  const pkgPath = path.join(targetDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.version = canaryVersion;
  rewriteDepsField(pkg, "dependencies", allNames);
  rewriteDepsField(pkg, "devDependencies", allNames);
  rewriteDepsField(pkg, "peerDependencies", allNames);
  rewriteDepsField(pkg, "optionalDependencies", allNames);
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

  const args = ["publish", "--tag", "canary", "--access", "public"];
  if (dryRun) args.push("--dry-run");
  else args.push("--provenance");

  if (!existsSync(path.join(targetDir, "package.json"))) {
    throw new Error(`Missing package.json for ${pkgName} at ${targetDir}`);
  }
  console.log(`[canary] publishing ${pkgName}@${canaryVersion} (${dryRun ? "dry-run" : "live"})`);
  run("npm", args, targetDir);
}

console.log(`[canary] completed ${dryRun ? "dry-run" : "live"} publish for ${canaryVersion}`);
