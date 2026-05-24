import test from "node:test";
import assert from "node:assert/strict";

const { Dialog, Tabs, Checkbox } = await import("../dist/index.js");

test("public imports exist", () => {
  assert.equal(typeof Dialog.Root, "function");
  assert.equal(typeof Tabs.Trigger, "function");
  assert.equal(typeof Checkbox.Root, "function");
});
