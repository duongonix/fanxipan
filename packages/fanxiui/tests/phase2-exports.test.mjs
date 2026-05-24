import test from "node:test";
import assert from "node:assert/strict";

const mod = await import("../dist/index.js");

test("phase2 exports exist", () => {
  assert.equal(typeof mod.Switch.Root, "function");
  assert.equal(typeof mod.RadioGroup.Root, "function");
  assert.equal(typeof mod.Toggle.Root, "function");
  assert.equal(typeof mod.ToggleGroup.Root, "function");
  assert.equal(typeof mod.Progress.Root, "function");
  assert.equal(typeof mod.Slider.Root, "function");
});
