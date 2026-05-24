import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(here, "..");
const rawIconsDir = path.join(pkgRoot, "raw-icons");
const cacheRoot = path.resolve(pkgRoot, "..", "..", ".cache");
const lucideRepoDir = path.join(cacheRoot, "lucide");

function run(command, args, cwd = process.cwd()) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with code ${result.status}`);
  }
}

function resolveSourceIconsDir() {
  const fromEnv = process.env.LUCIDE_ICONS_DIR;
  if (fromEnv) {
    const resolved = path.resolve(fromEnv);
    if (!existsSync(resolved)) {
      throw new Error(`LUCIDE_ICONS_DIR does not exist: ${resolved}`);
    }
    return resolved;
  }

  if (!existsSync(lucideRepoDir)) {
    mkdirSync(cacheRoot, { recursive: true });
    run("git", ["clone", "--depth=1", "https://github.com/lucide-icons/lucide.git", lucideRepoDir], pkgRoot);
  }

  const candidate = path.join(lucideRepoDir, "icons");
  if (!existsSync(candidate)) {
    throw new Error(`Unable to locate Lucide icons directory at ${candidate}`);
  }
  return candidate;
}

function syncIcons() {
  const sourceDir = resolveSourceIconsDir();
  mkdirSync(rawIconsDir, { recursive: true });
  rmSync(rawIconsDir, { recursive: true, force: true });
  mkdirSync(rawIconsDir, { recursive: true });

  const files = readdirSync(sourceDir).filter((f) => f.endsWith(".svg"));
  for (const file of files) {
    cpSync(path.join(sourceDir, file), path.join(rawIconsDir, file));
  }
  console.log(`[fanxicon] synced ${files.length} icons from ${sourceDir}`);
}

syncIcons();

