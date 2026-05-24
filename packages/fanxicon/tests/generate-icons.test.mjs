import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import {
  extractSvgNodes,
  kebabToPascalCase,
  normalizeComponentName,
} from "../scripts/generate-icons.mjs";

const pkgRoot = path.resolve(import.meta.dirname, "..");

test("kebab to pascal", () => {
  assert.equal(kebabToPascalCase("home"), "Home");
  assert.equal(kebabToPascalCase("arrow-right"), "ArrowRight");
  assert.equal(kebabToPascalCase("circle-alert"), "CircleAlert");
});

test("reserved names", () => {
  assert.equal(normalizeComponentName("import"), "ImportIcon");
});

test("extracts allowed SVG nodes", () => {
  const nodes = extractSvgNodes(
    `<svg><path d="x"/><circle cx="1" cy="1" r="1"/><rect x="0" y="0" width="1" height="1"/><line x1="0" y1="0" x2="1" y2="1"/><polyline points="0 0 1 1"/><polygon points="0 0 1 1"/><ellipse cx="1" cy="1" rx="1" ry="1"/><text>skip</text></svg>`,
  );
  assert.deepEqual(nodes.map((n) => n[0]), ["path", "circle", "rect", "line", "polyline", "polygon", "ellipse"]);
});

test("generated index exports Home", () => {
  const indexFile = path.join(pkgRoot, "src", "index.ts");
  assert.equal(existsSync(indexFile), true);
  const content = readFileSync(indexFile, "utf8");
  assert.equal(content.includes('export { Home } from "./icons/generated/Home.js";'), true);
});
