import { describe, expect, it } from "vitest";
import { createDevtoolsBridge } from "./devtools.js";

describe("fanxikit devtools bridge", () => {
  it("broadcasts lifecycle events", () => {
    const bridge = createDevtoolsBridge();
    const events: string[] = [];
    const off = bridge.subscribe((event) => events.push(event.type));
    bridge.emit("fanxikit:navigation-start", { to: "/about" });
    off();
    bridge.emit("fanxikit:navigation-end", { to: "/about" });
    expect(events).toEqual(["fanxikit:navigation-start"]);
  });
});
