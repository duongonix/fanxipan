import { describe, expect, it } from "vitest";
import { extractHeadAndCssFromFanxi } from "./head.js";

describe("fanxikit head/css collection", () => {
  it("collects title meta link script style from fanxi source", () => {
    const src = `
<title>Demo</title>
<meta name="description" content="x" />
<link rel="stylesheet" href="/a.css" />
<script>console.log("ok")</script>
<style>.a { color: red; }</style>
<main><h1>Hi</h1></main>
`;
    const out = extractHeadAndCssFromFanxi(src);
    expect(out.title).toBe("Demo");
    expect(out.tags.some((x) => x.includes("<meta"))).toBe(true);
    expect(out.tags.some((x) => x.includes("<link"))).toBe(true);
    expect(out.tags.some((x) => x.includes("<script"))).toBe(true);
    expect(out.css[0]).toContain(".a { color: red; }");
  });
});
