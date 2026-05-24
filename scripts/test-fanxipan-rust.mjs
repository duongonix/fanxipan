import { spawnSync } from "node:child_process";

const args =
  process.platform === "win32"
    ? ["+stable-x86_64-pc-windows-msvc", "test", "--workspace", "--exclude", "fanxipan_node"]
    : ["test", "--workspace", "--exclude", "fanxipan_node"];

const res = spawnSync("cargo", args, {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (res.status !== 0) {
  process.exit(res.status ?? 1);
}
