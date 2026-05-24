import test from "node:test";
import assert from "node:assert/strict";

const mod = await import("../dist/index.js");

test("phase5 exports exist", () => {
  assert.equal(typeof mod.Menu.Root, "function");
  assert.equal(typeof mod.DropdownMenu.Root, "function");
  assert.equal(typeof mod.ContextMenu.Root, "function");
});
