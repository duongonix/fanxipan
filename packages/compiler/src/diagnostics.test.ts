import { describe, expect, it } from "vitest";
import { analyzeTemplateBalance } from "./diagnostics";

describe("analyzeTemplateBalance", () => {
  it("reports missing for block with line/column", () => {
    const src = `<ul>\n  {#for item in items}\n    <li>{item}</li>\n</ul>`;
    const diagnostics = analyzeTemplateBalance(src, "App.fanxi");
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].message).toContain("Missing {/for}");
    expect(diagnostics[0].line).toBe(2);
    expect(diagnostics[0].column).toBe(3);
  });

  it("reports unexpected elif location", () => {
    const src = `<div>\n{:elif a > 1}\n</div>`;
    const diagnostics = analyzeTemplateBalance(src, "App.fanxi");
    const hit = diagnostics.find((d) => d.message.includes("Unexpected"));
    expect(hit).toBeTruthy();
    expect(hit?.line).toBe(2);
    expect(hit?.column).toBe(1);
  });

  it("reports typo in reactive helper name", () => {
    const src = `function App(){ let d = $dericved(count * 2); return (<div>{d}</div>) }`;
    const diagnostics = analyzeTemplateBalance(src, "App.fanxi");
    const hit = diagnostics.find((d) => d.code === "fanxipan_DEPRECATED[compiler-helper-dericved-typo]");
    expect(hit).toBeTruthy();
    expect(hit?.message).toContain("Deprecated syntax");
    expect(hit?.suggestion).toContain("$derived");
  });
});



