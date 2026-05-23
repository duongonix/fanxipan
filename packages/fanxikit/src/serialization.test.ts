import { describe, expect, it } from "vitest";
import { deserializeFromHtml, serializeForHtml } from "./serialization.js";

describe("fanxikit serialization", () => {
  it("escapes html-sensitive characters", () => {
    const raw = { html: "</script><div>&" };
    const serialized = serializeForHtml(raw);
    expect(serialized).toContain("\\u003c");
    expect(serialized).toContain("\\u003e");
    expect(serialized).toContain("\\u0026");
    expect(deserializeFromHtml<typeof raw>(serialized)).toEqual(raw);
  });
});
