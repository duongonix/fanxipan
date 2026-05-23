import { describe, expect, it } from "vitest";
import { validateRouteManifest } from "./diagnostics.js";
import type { RouteManifest } from "./types.js";

describe("fanxikit diagnostics", () => {
  it("reports route conflicts by final path", () => {
    const manifest: RouteManifest = {
      root: "/app",
      routesDir: "src/routes",
      generatedAt: "now",
      entries: [
        { id: "/(a)/about", path: "/about", segments: ["(a)", "about"], files: [{ kind: "page", file: "(a)/about/+page.fanxi" }] },
        { id: "/(b)/about", path: "/about", segments: ["(b)", "about"], files: [{ kind: "page", file: "(b)/about/+page.fanxi" }] },
      ],
    };
    expect(validateRouteManifest(manifest)[0]?.code).toBe("fanxikit_ROUTE_CONFLICT");
  });
});
