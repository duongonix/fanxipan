import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { createRouteManifest } from "./manifest.js";
import { prerenderRoutes } from "./prerender.js";

describe("fanxikit prerender", () => {
  it("writes static html for prerender routes", () => {
    const root = mkdtempSync(path.join(tmpdir(), "fanxikit-prerender-"));
    try {
      mkdirSync(path.join(root, "src/routes/about"), { recursive: true });
      writeFileSync(path.join(root, "src/routes/+layout.ts"), "export const prerender = true;", "utf8");
      writeFileSync(path.join(root, "src/routes/+page.fanxi"), "<main>home</main>", "utf8");
      writeFileSync(path.join(root, "src/routes/about/+page.fanxi"), "<main>about</main>", "utf8");
      const manifest = createRouteManifest(root);
      const outDir = path.join(root, "build");
      const pages = prerenderRoutes(manifest, { outDir, spaFallback: "200.html" });
      expect(pages.some((x) => x.path === "/")).toBe(true);
      expect(pages.some((x) => x.path === "/about")).toBe(true);
      const index = readFileSync(path.join(outDir, "index.html"), "utf8");
      expect(index).toContain("fanxikit - /");
      const fallback = readFileSync(path.join(outDir, "200.html"), "utf8");
      expect(fallback).toContain("<!doctype html>");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
