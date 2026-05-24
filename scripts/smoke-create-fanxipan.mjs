import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

function run(command, args, cwd = process.cwd()) {
  const res = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (res.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with code ${res.status}`);
  }
}

const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "fanxipan-create-smoke-"));
const appDir = path.join(tmpRoot, "sample-app");

try {
  run("pnpm", ["--filter", "create-fanxipan", "build"]);
  run("node", ["packages/create-fanxipan/dist/index.js", appDir, "--template=basic"]);

  const required = [
    path.join(appDir, "package.json"),
    path.join(appDir, "src", "App.fanxi"),
    path.join(appDir, "vite.config.ts"),
  ];
  for (const file of required) {
    if (!existsSync(file)) {
      throw new Error(`[smoke-create] missing scaffold file: ${file}`);
    }
  }

  const pkg = JSON.parse(readFileSync(path.join(appDir, "package.json"), "utf8"));
  if (!pkg.dependencies || !pkg.dependencies.fanxipan) {
    throw new Error("[smoke-create] scaffolded package.json missing fanxipan dependency");
  }

  console.log(`[smoke-create] ok (${process.platform}/${process.arch}) at ${appDir}`);
} finally {
  rmSync(tmpRoot, { recursive: true, force: true });
}

