import { describe, expect, it, vi } from "vitest";
import fanxipan from "./index";

describe("fanxipan public api", () => {
  it("render clears target by default and cleanup is idempotent", () => {
    const host = {
      nodeType: 1,
      replaceChildren: vi.fn(),
    } as any;
    const cleanup = vi.fn();
    const stop = fanxipan.render(() => cleanup, host);
    expect(host.replaceChildren).toHaveBeenCalledTimes(1);
    stop();
    stop();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("hydrate does not clear target", () => {
    const host = {
      nodeType: 1,
      replaceChildren: vi.fn(),
    } as any;
    const stop = fanxipan.hydrate(() => {}, host);
    expect(host.replaceChildren).not.toHaveBeenCalled();
    stop();
  });

  it("exposes a frozen public contract version", () => {
    expect(fanxipan.contractVersion).toBe("1.0.0");
  });

  it("asserts API contract version strictly", () => {
    expect(() => fanxipan.assertContract("1.0.0")).not.toThrow();
    expect(() => fanxipan.assertContract("2.0.0")).toThrow(/contract mismatch/);
  });

  it("throws on invalid render target", () => {
    expect(() => fanxipan.render(() => {}, null)).toThrow(/valid Element/);
  });

  it("hmr apply restores snapshot for component boundary", () => {
    const host = {
      nodeType: 1,
      replaceChildren: vi.fn(),
    } as any;
    const snap = { count: 3 };
    const oldCleanup = vi.fn();
    const oldComp: any = () => oldCleanup;
    oldComp.__fanxipan_HMR_ID__ = "rx:test";
    oldComp.__fanxipan_HMR_SNAPSHOT__ = vi.fn(() => snap);

    const restore = vi.fn();
    const nextCleanup = vi.fn();
    const nextComp: any = () => nextCleanup;
    nextComp.__fanxipan_HMR_RESTORE__ = restore;

    const stop = fanxipan.render(oldComp, host);
    (globalThis as any).__fanxipan_HMR_APPLY__("rx:test", nextComp);
    expect(oldComp.__fanxipan_HMR_SNAPSHOT__).toHaveBeenCalledTimes(1);
    expect(restore).toHaveBeenCalledWith(snap);
    stop();
  });

  it("hmr apply runs snapshot -> cleanup -> restore -> next mount order", () => {
    const host = {
      nodeType: 1,
      replaceChildren: vi.fn(),
    } as any;
    const order: string[] = [];
    const oldComp: any = () => () => {
      order.push("cleanup");
    };
    oldComp.__fanxipan_HMR_ID__ = "rx:ordered";
    oldComp.__fanxipan_HMR_SNAPSHOT__ = () => {
      order.push("snapshot");
      return { n: 1 };
    };
    const nextComp: any = () => {
      order.push("mount-next");
      return () => {};
    };
    nextComp.__fanxipan_HMR_RESTORE__ = () => {
      order.push("restore");
    };

    const stop = fanxipan.render(oldComp, host);
    (globalThis as any).__fanxipan_HMR_APPLY__("rx:ordered", nextComp);
    expect(order).toEqual(["snapshot", "cleanup", "restore", "mount-next"]);
    stop();
  });
});


