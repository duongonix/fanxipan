import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createRouteManifest } from "./manifest.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("createRouteManifest", () => {
  it("creates entries from route conventions", () => {
    const root = mkdtempSync(path.join(tmpdir(), "fanxikit-"));
    tempDirs.push(root);

    mkdirSync(path.join(root, "src/routes/blog/[id]"), { recursive: true });
    mkdirSync(path.join(root, "src/routes/docs/[...slug]"), { recursive: true });

    writeFileSync(path.join(root, "src/routes/+page.fanxi"), "<div/>", "utf8");
    writeFileSync(path.join(root, "src/routes/blog/[id]/+page.fanxi"), "<div/>", "utf8");
    writeFileSync(path.join(root, "src/routes/blog/[id]/+page.server.ts"), "export {};", "utf8");
    writeFileSync(path.join(root, "src/routes/docs/[...slug]/+page.fanxi"), "<div/>", "utf8");

    const manifest = createRouteManifest(root);
    const paths = manifest.entries.map((entry) => entry.path);

    expect(paths).toContain("/");
    expect(paths).toContain("/blog/:id");
    expect(paths).toContain("/docs/*slug");
  });
});



