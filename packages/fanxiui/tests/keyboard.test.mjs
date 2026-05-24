import test from "node:test";
import assert from "node:assert/strict";

const { KEYS } = await import("../dist/internal/keyboard.js");

test("keyboard constants", () => {
  assert.equal(KEYS.Escape, "Escape");
  assert.equal(KEYS.ArrowRight, "ArrowRight");
});
