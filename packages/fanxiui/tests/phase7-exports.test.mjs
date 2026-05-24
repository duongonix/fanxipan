import test from "node:test";
import assert from "node:assert/strict";

const mod = await import("../dist/index.js");

test("phase7 exports exist", () => {
  assert.equal(typeof mod.Toast.Provider, "function");
  assert.equal(typeof mod.ScrollArea.Root, "function");
  assert.equal(typeof mod.Avatar.Root, "function");
});
