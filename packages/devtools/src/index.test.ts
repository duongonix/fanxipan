import { describe, expect, it } from "vitest";
import { initDevtools } from "./index";

describe("devtools foundation", () => {
  it("tracks components, state and events", () => {
    const tools = initDevtools();
    const off = tools.registerComponent({ id: "cmp", name: "Counter" });
    tools.updateState("cmp", { count: 1 });
    tools.traceEffect("cmp", { name: "effect_1" });
    const snap = tools.snapshot();
    expect(snap.components.some((node) => node.id === "cmp")).toBe(true);
    expect(snap.events.some((event) => event.type === "state:update")).toBe(true);
    off();
  });
});
