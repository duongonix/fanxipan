import { spawnSync } from "node:child_process";

const commands = [
  ["pnpm", ["run", "build:core"]],
  ["pnpm", ["--filter", "@examples/basic", "build"]],
  ["pnpm", ["--filter", "@examples/todo", "build"]],
];

for (const [cmd, args] of commands) {
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

console.log("Smoke examples passed.");
