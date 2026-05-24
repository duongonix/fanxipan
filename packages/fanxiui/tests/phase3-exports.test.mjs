import test from "node:test";
import assert from "node:assert/strict";

const mod = await import("../dist/index.js");

test("phase3 exports exist", () => {
  assert.equal(typeof mod.Collapsible.Root, "function");
  assert.equal(typeof mod.Accordion.Root, "function");
  assert.equal(typeof mod.Accordion.Trigger, "function");
});
