import { spawnSync } from "node:child_process";

const mode = process.argv[2] ?? "dev";
const allowed = new Set(["dev", "build"]);

if (!allowed.has(mode)) {
  console.error(`[run-vite] Unsupported mode: ${mode}`);
  process.exit(1);
}

const args =
  mode === "build"
    ? ["exec", "vite", "build", "--configLoader", "runner"]
    : ["exec", "vite", "--configLoader", "runner"];
const result = spawnSync("pnpm", args, {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: true,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
