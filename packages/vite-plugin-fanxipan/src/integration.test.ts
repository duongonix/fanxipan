import { describe, expect, it, vi } from "vitest";

describe("fanxipan plugin integration", () => {
  it("uses compiler output with boundary marker and create function", async () => {
    vi.resetModules();
    vi.doUnmock("compiler");
    const { fanxipanPlugin } = await import("./index");

    const plugin = fanxipanPlugin({ hmr: true });
    const warn = vi.fn();
    const rx = `function App(){ return (<div>hello</div>) }`;
    const out = (await plugin.transform!.call({ warn } as any, rx, "/src/App.fanxi")) as any;

    expect(out.code).toContain("export function create");
    expect(out.code).toContain("import.meta.hot.accept");
  });
});



