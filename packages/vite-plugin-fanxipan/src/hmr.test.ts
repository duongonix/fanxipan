import { describe, expect, it, vi } from "vitest";
import { handleFanxiHotUpdate } from "./hmr";

describe("handleFanxiHotUpdate", () => {
  it("returns empty for non-rx file", () => {
    const ctx: any = {
      file: "src/main.ts",
      server: {
        moduleGraph: { getModulesByFile: vi.fn() },
        ws: { send: vi.fn() },
        reloadModule: vi.fn(),
      },
    };
    expect(handleFanxiHotUpdate(ctx)).toEqual([]);
  });

  it("triggers full reload when no modules", () => {
    const send = vi.fn();
    const ctx: any = {
      file: "src/App.fanxi",
      server: {
        moduleGraph: { getModulesByFile: vi.fn(() => undefined) },
        ws: { send },
        reloadModule: vi.fn(),
      },
    };
    expect(handleFanxiHotUpdate(ctx)).toEqual([]);
    expect(send).toHaveBeenCalledWith({ type: "full-reload" });
  });

  it("reloads only boundary modules", () => {
    const modA = { id: "/src/App.fanxi", importers: new Set() };
    const modB = { id: "/src/dep.js", importers: new Set() };
    const reload = vi.fn();
    const send = vi.fn();
    const ctx: any = {
      file: "src/App.fanxi",
      server: {
        moduleGraph: { getModulesByFile: vi.fn(() => new Set([modA, modB])) },
        ws: { send },
        reloadModule: reload,
      },
    };
    const out = handleFanxiHotUpdate(ctx);
    expect(out).toEqual([modA]);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "custom",
        event: "fanxipan:hmr-boundaries",
      })
    );
  });

  it("reloads importer boundary in invalidation graph", () => {
    const app = { id: "/src/App.fanxi", importers: new Set<any>() };
    const route = { id: "/src/Route.fanxi", importers: new Set<any>() };
    const dep = { id: "/src/dep.js", importers: new Set<any>([route]) };
    app.importers.add(dep);
    const reload = vi.fn();
    const ctx: any = {
      file: "src/App.fanxi",
      server: {
        moduleGraph: { getModulesByFile: vi.fn(() => new Set([app])) },
        ws: { send: vi.fn() },
        reloadModule: reload,
      },
    };
    const out = handleFanxiHotUpdate(ctx);
    expect(out.map((m: any) => m.id).sort()).toEqual(["/src/App.fanxi", "/src/Route.fanxi"]);
    expect(reload).toHaveBeenCalledTimes(2);
  });
});



