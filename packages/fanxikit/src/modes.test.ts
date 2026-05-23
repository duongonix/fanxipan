import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { createRouteManifest } from "./manifest.js";
import { resolveRouteRenderMode } from "./modes.js";

describe("fanxikit route modes", () => {
  it("inherits and overrides ssr/csr/prerender from layout/page", () => {
    const root = mkdtempSync(path.join(tmpdir(), "fanxikit-modes-"));
    try {
      mkdirSync(path.join(root, "src/routes/about"), { recursive: true });
      writeFileSync(path.join(root, "src/routes/+layout.ts"), "export const prerender = true;", "utf8");
      writeFileSync(path.join(root, "src/routes/+page.fanxi"), "<main>home</main>", "utf8");
      writeFileSync(path.join(root, "src/routes/about/+page.fanxi"), "<main>about</main>", "utf8");
      writeFileSync(path.join(root, "src/routes/about/+page.ts"), "export const ssr = false; export const csr = true;", "utf8");
      const manifest = createRouteManifest(root);
      const entry = manifest.entries.find((x) => x.id === "/about");
      if (!entry) throw new Error("missing /about");
      const mode = resolveRouteRenderMode(manifest, entry);
      expect(mode.prerender).toBe(true);
      expect(mode.ssr).toBe(false);
      expect(mode.csr).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
