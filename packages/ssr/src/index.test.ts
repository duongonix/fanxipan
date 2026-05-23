import { describe, expect, it } from "vitest";
import { renderToString } from "./index";

describe("ssr foundation", () => {
  it("returns stable render shell shape", () => {
    expect(renderToString()).toEqual({ html: "", payload: "{}" });
  });
});
