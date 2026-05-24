import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Home } from "../src/index";

const pkgRoot = path.resolve(__dirname, "..");

describe("fanxicon package", () => {
  it("can import Home from fanxicon public entry", () => {
    expect(typeof Home).toBe("function");
  });

  it("build output includes dist index files", () => {
    const result = spawnSync("pnpm", ["run", "build"], {
      cwd: pkgRoot,
      stdio: "pipe",
      shell: process.platform === "win32",
    });
    expect(result.status).toBe(0);
    expect(existsSync(path.join(pkgRoot, "dist", "index.js"))).toBe(true);
    expect(existsSync(path.join(pkgRoot, "dist", "index.d.ts"))).toBe(true);
  }, 120000);
});

