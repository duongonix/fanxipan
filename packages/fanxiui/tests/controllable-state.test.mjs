import test from "node:test";
import assert from "node:assert/strict";
import { createControllableState } from "../dist/internal/controllable-state.js";

test("controllable state uncontrolled", () => {
  const s = createControllableState({ defaultProp: false });
  assert.equal(s.get(), false);
  s.set(true);
  assert.equal(s.get(), true);
});

test("controllable state controlled callback", () => {
  let next = false;
  const s = createControllableState({ prop: false, defaultProp: false, onChange: (v) => { next = v; } });
  s.set(true);
  assert.equal(next, true);
  assert.equal(s.get(), false);
});
