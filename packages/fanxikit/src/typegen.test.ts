import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import type { RouteManifest } from "./types.js";
import { generateRouteTypes } from "./typegen.js";

describe("fanxikit type generation", () => {
  it("generates $types files for routes", () => {
    const root = mkdtempSync(path.join(tmpdir(), "fanxikit-typegen-"));
    try {
      const manifest: RouteManifest = {
        root,
        routesDir: "src/routes",
        generatedAt: new Date(0).toISOString(),
        entries: [
          { id: "/", path: "/", segments: [], files: [{ kind: "page", file: "+page.fanxi" }] },
          {
            id: "/blog/[id]",
            path: "/blog/:id",
            segments: ["blog", "[id]"],
            files: [{ kind: "page", file: "blog/[id]/+page.fanxi" }],
          },
        ],
      };
      const out = generateRouteTypes(root, manifest);
      expect(out.files.some((x) => x.endsWith("root\\$types.d.ts") || x.endsWith("root/$types.d.ts"))).toBe(true);
      expect(out.files.some((x) => x.includes("blog") && x.endsWith("$types.d.ts"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
