import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  extractSvgNodes,
  kebabToPascalCase,
  normalizeComponentName,
} from "../scripts/generate-icons.mjs";

const pkgRoot = path.resolve(__dirname, "..");

describe("generate-icons", () => {
  it("converts kebab-case names to PascalCase", () => {
    expect(kebabToPascalCase("home")).toBe("Home");
    expect(kebabToPascalCase("arrow-right")).toBe("ArrowRight");
    expect(kebabToPascalCase("circle-alert")).toBe("CircleAlert");
  });

  it("normalizes reserved names", () => {
    expect(normalizeComponentName("import")).toBe("ImportIcon");
  });

  it("extracts only allowed svg nodes and attrs", () => {
    const nodes = extractSvgNodes(
      `<svg width="24"><g><path d="M0 0"/><circle cx="12" cy="12" r="4"/><rect x="1" y="2" width="3" height="4"/><line x1="0" y1="0" x2="1" y2="1"/><polyline points="0 0 1 1"/><polygon points="0 0 1 1 1 0"/><ellipse cx="5" cy="5" rx="2" ry="1"/><text x="1">skip</text></g></svg>`,
    );
    expect(nodes.map((n) => n[0])).toEqual([
      "path",
      "circle",
      "rect",
      "line",
      "polyline",
      "polygon",
      "ellipse",
    ]);
  });

  it("generated index exports icons", () => {
    const indexFile = path.join(pkgRoot, "src", "index.ts");
    expect(existsSync(indexFile)).toBe(true);
    const content = readFileSync(indexFile, "utf8");
    expect(content).toContain('export { Home } from "./icons/generated/Home.js";');
  });
});
