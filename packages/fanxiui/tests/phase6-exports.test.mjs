import test from "node:test";
import assert from "node:assert/strict";

const mod = await import("../dist/index.js");

test("phase6 exports exist", () => {
  assert.equal(typeof mod.Select.Root, "function");
  assert.equal(typeof mod.Select.Item, "function");
  assert.equal(typeof mod.Combobox.Root, "function");
  assert.equal(typeof mod.Listbox.Root, "function");
});
