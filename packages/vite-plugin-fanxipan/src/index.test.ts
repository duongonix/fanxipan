import { describe, expect, it, vi } from "vitest";

describe("fanxipanPlugin", () => {
  it("transforms .fanxi with compiler output", async () => {
    vi.resetModules();
    vi.doMock("compiler", () => ({
      compile: vi.fn(() => ({
        code: "export default 1;",
        map: {
          version: 3,
          file: "App.fanxi",
          sources: ["App.fanxi"],
          names: [],
          mappings: "",
          sourcesContent: [""],
        },
        diagnostics: [],
      })),
    }));

    const { fanxipanPlugin } = await import("./index");
    const plugin = fanxipanPlugin();
    const warn = vi.fn();
    const out = await plugin.transform!.call({ warn } as any, "<div/>", "/src/App.fanxi");

    expect(out && (out as any).code).toContain("export default 1");
    expect(warn).not.toHaveBeenCalled();
  });

  it("emits warnings when diagnostics exist", async () => {
    vi.resetModules();
    vi.doMock("compiler", () => ({
      compile: vi.fn(() => ({
        code: "export default 1;",
        map: {
          version: 3,
          file: "App.fanxi",
          sources: ["App.fanxi"],
          names: [],
          mappings: "",
          sourcesContent: [""],
        },
        diagnostics: [
          {
            severity: "warning",
            message: "Missing {/for}",
            filename: "App.fanxi",
            line: 2,
            column: 3,
            suggestion: "Add closing {/for}",
          },
        ],
      })),
    }));

    const { fanxipanPlugin } = await import("./index");
    const onDiagnostic = vi.fn();
    const plugin = fanxipanPlugin({ onDiagnostic });
    const warn = vi.fn();
    await plugin.transform!.call({ warn } as any, "<div/>", "/src/App.fanxi");

    expect(onDiagnostic).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0][0])).toContain("Missing {/for}");
  });

  it("promotes warnings to errors when configured", async () => {
    vi.resetModules();
    vi.doMock("compiler", () => ({
      compile: vi.fn(() => ({
        code: "export default 1;",
        map: {
          version: 3,
          file: "App.fanxi",
          sources: ["App.fanxi"],
          names: [],
          mappings: "",
          sourcesContent: [""],
        },
        diagnostics: [
          {
            severity: "warning",
            message: "Unused CSS selector '.x'",
            filename: "App.fanxi",
            line: 2,
            column: 3,
          },
        ],
      })),
    }));

    const { fanxipanPlugin } = await import("./index");
    const plugin = fanxipanPlugin({ treatWarningsAsErrors: true });
    const error = vi.fn((msg: string) => {
      throw new Error(msg);
    });
    const warn = vi.fn();
    expect(() =>
      plugin.transform!.call({ warn, error } as any, "<div/>", "/src/App.fanxi")
    ).toThrow();
    expect(error).toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});



