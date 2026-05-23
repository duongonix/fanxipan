import { describe, expect, it } from "vitest";
import {
  FanxiMap,
  FanxiSet,
  createRenderContext,
  derived,
  effect,
  flushEffects,
  inject,
  provide,
  runWithRenderContext,
  state,
} from "./index";
import { writable, readable, derived as derivedStore } from "./store";

describe("runtime reactivity", () => {
  it("state get/set works", () => {
    const s = state(1);
    expect(s.get()).toBe(1);
    s.set(2);
    expect(s.get()).toBe(2);
  });

  it("effect cleanup runs", () => {
    let cleaned = false;
    const stop = effect(() => () => {
      cleaned = true;
    });
    expect(cleaned).toBe(false);
    stop();
    expect(cleaned).toBe(true);
  });

  it("batches updates and re-runs effect once", () => {
    const count = state(0);
    let runs = 0;
    effect(() => {
      count.get();
      runs += 1;
    });
    count.set(1);
    count.set(2);
    count.set(3);
    flushEffects();
    expect(runs).toBe(2);
  });

  it("updates derived value from dependencies", () => {
    const count = state(2);
    const double = derived(() => count.get() * 2);
    flushEffects();
    expect(double()).toBe(4);
    count.set(3);
    flushEffects();
    expect(double()).toBe(6);
  });
});

describe("runtime render context", () => {
  it("subscribeExpr + cleanupAll works", () => {
    const ctx = createRenderContext();
    let count = 0;
    const off = ctx.subscribeExpr(["count"], () => {
      count += 1;
    });
    off();
    ctx.onCleanup(() => {
      count += 10;
    });
    ctx.cleanupAll();
    expect(count).toBe(10);
  });

  it("provide/inject resolves through render context parents", () => {
    const parent = createRenderContext();
    const child = createRenderContext(parent);
    runWithRenderContext(parent, () => provide("theme", "dark"));
    const value = runWithRenderContext(child, () => inject("theme", "light"));
    expect(value).toBe("dark");
  });
});

describe("runtime reactive built-ins", () => {
  it("FanxiMap and FanxiSet invalidate effects", () => {
    const map = new FanxiMap<string, number>([["seed", 1]]);
    const set = new FanxiSet<string>(["seed"]);
    let runs = 0;
    effect(() => {
      map.size;
      set.size;
      runs += 1;
    });
    expect(map.get("seed")).toBe(1);
    expect(set.has("seed")).toBe(true);
    map.set("a", 1);
    set.add("x");
    flushEffects();
    expect(runs).toBe(2);
  });
});

describe("runtime stores", () => {
  it("writable set/update/subscribe works", () => {
    const count = writable(0);
    const values: number[] = [];
    const off = count.subscribe((v) => values.push(v));
    count.set(2);
    count.update((v) => v + 3);
    off();
    expect(values).toEqual([0, 2, 5]);
  });

  it("readable start/stop notifier works", () => {
    let started = 0;
    let stopped = 0;
    const clock = readable(1, () => {
      started += 1;
      return () => {
        stopped += 1;
      };
    });
    const off = clock.subscribe(() => {});
    off();
    expect(started).toBe(1);
    expect(stopped).toBe(1);
  });

  it("derived store works with single and multiple stores", () => {
    const a = writable(2);
    const b = writable(3);
    const sum = derivedStore([a, b] as const, (values: readonly [number, number]) => values[0] + values[1], 0);
    let last = -1;
    const off = sum.subscribe((v) => {
      last = v;
    });
    expect(last).toBe(5);
    a.set(5);
    expect(last).toBe(8);
    off();

    const double = derivedStore(a, (value: number) => value * 2, 0);
    let d = 0;
    const off2 = double.subscribe((v) => {
      d = v;
    });
    expect(d).toBe(10);
    off2();
  });
});
