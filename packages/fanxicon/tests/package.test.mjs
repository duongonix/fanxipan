import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { existsSync } from "node:fs";

test("can import Home from package entry", async () => {
  const mod = await import("../dist/index.js");
  assert.equal(typeof mod.Home, "function");
});

test("build output includes dist index files", () => {
  const dist = path.resolve(import.meta.dirname, "..", "dist");
  assert.equal(existsSync(path.join(dist, "index.js")), true);
  assert.equal(existsSync(path.join(dist, "index.d.ts")), true);
});

