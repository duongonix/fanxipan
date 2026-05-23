import { describe, expect, it } from "vitest";
import { matchManifestRoute } from "./match.js";
import type { RouteManifest } from "./types.js";

const manifest: RouteManifest = {
  root: "/app",
  routesDir: "src/routes",
  generatedAt: new Date().toISOString(),
  entries: [
    {
      id: "/",
      path: "/",
      segments: [],
      files: [{ kind: "page", file: "+page.fanxi" }],
    },
    {
      id: "/blog/[id]",
      path: "/blog/:id",
      segments: ["blog", "[id]"],
      files: [{ kind: "page", file: "blog/[id]/+page.fanxi" }],
    },
    {
      id: "/docs/[...slug]",
      path: "/docs/*slug",
      segments: ["docs", "[...slug]"],
      files: [{ kind: "page", file: "docs/[...slug]/+page.fanxi" }],
    },
    {
      id: "/[[lang]]",
      path: "/:lang?",
      segments: ["[[lang]]"],
      files: [{ kind: "page", file: "[[lang]]/+page.fanxi" }],
    },
  ],
};

describe("matchManifestRoute", () => {
  it("matches dynamic params", () => {
    const match = matchManifestRoute(manifest, "/blog/42");
    expect(match?.entry.path).toBe("/blog/:id");
    expect(match?.params.id).toBe("42");
  });

  it("matches rest params", () => {
    const match = matchManifestRoute(manifest, "/docs/guides/setup");
    expect(match?.entry.path).toBe("/docs/*slug");
    expect(match?.params.slug).toBe("guides/setup");
  });

  it("matches optional params", () => {
    const match = matchManifestRoute(manifest, "/vi");
    expect(match?.entry.path).toBe("/:lang?");
    expect(match?.params.lang).toBe("vi");
  });
});

