import test from "node:test";
import assert from "node:assert/strict";

const mod = await import("../dist/index.js");

test("phase4 exports exist", () => {
  assert.equal(typeof mod.AlertDialog.Root, "function");
  assert.equal(typeof mod.Popover.Root, "function");
  assert.equal(typeof mod.Tooltip.Root, "function");
  assert.equal(typeof mod.HoverCard.Root, "function");
});
