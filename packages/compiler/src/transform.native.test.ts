import { describe, expect, it } from "vitest";
import { compile } from "./transform.js";

describe("compiler native-normalization", () => {
  it("keeps imports and default export contract for component usage", () => {
    const src = `
import Comp from "./Com.fanxi"
function App() {
  let count = $state(0)
  return (
    <div>
      <Comp name={"donix"} />
      <button onclick={() => count++}>ok</button>
    </div>
  )
}
export default App
`;
    const out = compile(src, { filename: "App.fanxi", hmr: true });
    expect(out.code).toContain('import Comp from "./Com.fanxi"');
    expect(out.code).toContain("ctx.mountComponent(Comp");
    expect(out.code).toContain("const __fanxipan_default_component = function App");
    expect(out.code).toContain("export default __fanxipan_default_component");
  });

  it("replaces derived symbol usage with expression in generated body", () => {
    const src = `
function App() {
  let count = $state(0)
  let double = $derived(count * 2)
  return (
    <div>{double}</div>
  )
}
`;
    const out = compile(src, { filename: "App.fanxi", hmr: false });
    expect(out.code).toContain("String((count * 2))");
    expect(out.code).toContain('ctx.subscribeExpr(["count"]');
  });

  it("keeps derived values valid inside object shorthand expressions", () => {
    const src = `
function App() {
  let count = $state(1)
  let double = $derived(count * 2)
  $effect(() => console.log({ double }))
  return (
    <div>{double}</div>
  )
}
`;
    const out = compile(src, { filename: "ObjectShorthand.fanxi", hmr: false });
    expect(out.code).toContain("console.log({ double: (count * 2) })");
  });

  it("always provides __fanxipan_hmr_state when hmr is enabled", () => {
    const src = `
function App() {
  return (<div>hello</div>)
}
`;
    const out = compile(src, { filename: "App.fanxi", hmr: true });
    expect(out.code).toContain("__fanxipan_hmr_state");
    expect(out.code).toContain("import.meta.hot.accept");
  });

  it("preserves runtime contract marker from Rust codegen", () => {
    const src = `
function App() {
  return (<div>hello</div>)
}
`;
    const out = compile(src, { filename: "App.fanxi", hmr: false });
    const hasMarker = out.code.includes('__fanxipan_RUNTIME_CONTRACT__ = "1.0.0"');
    const hasLegacyBridge = out.code.includes("let __fanxipan_props = {};");
    expect(hasMarker || hasLegacyBridge).toBe(true);
  });

  it("supports destructured props parameter by binding from props at runtime", () => {
    const src = `
function Comp({ name, click }) {
  return (
    <button onclick={click}>{name}</button>
  )
}
`;
    const out = compile(src, { filename: "Com.fanxi", hmr: false });
    expect(out.code).toContain("props = __fanxipan_props;");
    expect(out.code).toContain("click(event)");
    expect(out.code).toContain("String(name)");
  });

  it("wires $effect to dependency-aware runtime hooks", () => {
    const src = `
function App() {
  let count = $state(0)
  let double = $derived(count * 2)
  $effect(() => console.log(double))
  return (
    <button onclick={() => count++}>{double}</button>
  )
}
`;
    const out = compile(src, { filename: "App.fanxi", hmr: false });
    expect(out.code).toContain("const __fanxipan_attach_effects = () => {");
    expect(out.code).toContain("ctx.notify = (dep) => { __fanxipan_notify(dep); __fanxipan_schedule([dep]); };");
    expect(out.code).toContain("__fanxipan_detach_effects");
  });

  it("injects children binding and emit helper for component contract", () => {
    const src = `
function Item({ onSave }) {
  const submit = () => $emit("save", 123)
  return (
    <div>
      <slot />
      <button onclick={submit}>save</button>
    </div>
  )
}
`;
    const out = compile(src, { filename: "Item.fanxi", hmr: false });
    expect(out.code).toContain("let __fanxipan_children = undefined;");
    expect(out.code).toContain("children = __fanxipan_children;");
    expect(out.code).toContain("if (typeof children === 'function')");
  });

  it("can disable legacy compat pass via env flag", () => {
    const prev = process.env.fanxipan_LEGACY_COMPAT_PASS;
    process.env.fanxipan_LEGACY_COMPAT_PASS = "0";
    const src = `
function App() {
  return (<div>hello</div>)
}
`;
    try {
      const out = compile(src, { filename: "App.fanxi", hmr: false });
      expect(out.code).toContain("export function create");
    } finally {
      if (typeof prev === "string") process.env.fanxipan_LEGACY_COMPAT_PASS = prev;
      else delete process.env.fanxipan_LEGACY_COMPAT_PASS;
    }
  });

  it("preserves side-effect css imports from .fanxi source", () => {
    const src = `
import "./global.css"
function App() {
  return (<div>ok</div>)
}
export default App
`;
    const out = compile(src, { filename: "App.fanxi", hmr: false });
    expect(out.code).toContain('import "./global.css"');
  });

  it("warns on legacy section component format while keeping compatibility", () => {
    const src = `
<script lang="ts">
  import { fade } from "fanxipan/transitions";
  export let name: string = "Fanxipan";
  let count: number = $state(0);
</script>

<h1 transition:fade>{name}: {count}</h1>
<button onclick={() => count++}>inc</button>

<style>
h1 { color: red; }
</style>
`;
    const out = compile(src, { filename: "Panel.fanxi", hmr: false });
    expect(out.diagnostics.some((d) => d.code === "fanxipan_LEGACY_SECTION_FORMAT")).toBe(true);
    expect(out.code).toContain('import { fade } from "fanxipan/transitions"');
    expect(out.code).toContain('let name = props.name ?? ("Fanxipan")');
    expect(out.code).toMatch(/let count\s*=\s*\$state\(0\);/);
    expect(out.code).toContain("String(name)");
    expect(out.css).toContain("h1.fanxi-s-");
  });

  it("supports spread attrs, shorthand props, spread props and dynamic component codegen", () => {
    const src = `
import Current from "./Current.fanxi"
function App() {
  let attrs = $state({ id: "root" })
  let props = $state({ name: "Fanxipan" })
  let label = $state("short")
  return (
    <div {...attrs}>
      <Current {...props} {label} />
      <component this={Current} {...props} />
    </div>
  )
}
`;
    const out = compile(src, { filename: "Spread.fanxi", hmr: false });
    expect(out.code).toContain("Object.entries(attrs || {})");
    expect(out.code).toContain("Object.assign({}, (props || {}),");
    expect(out.code).toContain('"label": label');
    expect(out.code).toContain("ctx.mountComponent(Current");
  });

  it("extracts scoped CSS from Fanxipan module style export", () => {
    const src = `
function App() {
  return (
    <section class="card">ok</section>
  )
}

export const styles = \`
.card { color: red; }
\`

export default App
`;
    const out = compile(src, { filename: "Styled.fanxi", hmr: false });
    expect(out.css).toContain(".card.fanxi-s-");
    expect(out.diagnostics).not.toContainEqual(
      expect.objectContaining({ code: "fanxipan_LEGACY_SECTION_FORMAT" })
    );
  });
});



