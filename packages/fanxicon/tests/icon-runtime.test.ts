import { describe, expect, it } from "vitest";
import { createIcon } from "../src/runtime/create-icon";
import type { IconProps } from "../src/types";

type FakeEl = {
  tagName: string;
  attrs: Record<string, string>;
  children: FakeEl[];
  textContent: string;
  parentNode: FakeEl | null;
  setAttribute: (k: string, v: string) => void;
  appendChild: (el: FakeEl) => void;
  removeChild: (el: FakeEl) => void;
};

function createFakeDom() {
  const makeEl = (tagName: string): FakeEl => ({
    tagName,
    attrs: {},
    children: [],
    textContent: "",
    parentNode: null,
    setAttribute(k, v) {
      this.attrs[k] = v;
    },
    appendChild(el) {
      el.parentNode = this;
      this.children.push(el);
    },
    removeChild(el) {
      this.children = this.children.filter((x) => x !== el);
      el.parentNode = null;
    },
  });
  const target = makeEl("div");
  const doc = {
    createElementNS: (_ns: string, tag: string) => makeEl(tag),
  } as unknown as Document;
  return { doc, target };
}

function render(props: IconProps = {}) {
  const { doc, target } = createFakeDom();
  const oldDoc = globalThis.document;
  (globalThis as any).document = doc;
  const icon = createIcon("Home", [["path", { d: "M0 0" }]]);
  const cleanup = icon(target as unknown as Element, {}, props);
  const svg = target.children[0];
  return { svg, cleanup, restore: () => ((globalThis as any).document = oldDoc) };
}

describe("createIcon", () => {
  it("applies default props", () => {
    const { svg, restore } = render();
    expect(svg.attrs.width).toBe("24");
    expect(svg.attrs.height).toBe("24");
    expect(svg.attrs.stroke).toBe("currentColor");
    expect(svg.attrs["stroke-width"]).toBe("2");
    restore();
  });

  it("supports size, color and strokeWidth", () => {
    const { svg, restore } = render({ size: 20, color: "#60a5fa", strokeWidth: 1.75 });
    expect(svg.attrs.width).toBe("20");
    expect(svg.attrs.height).toBe("20");
    expect(svg.attrs.stroke).toBe("#60a5fa");
    expect(svg.attrs["stroke-width"]).toBe("1.75");
    restore();
  });

  it("sets aria-hidden=true without title/ariaLabel", () => {
    const { svg, restore } = render();
    expect(svg.attrs["aria-hidden"]).toBe("true");
    expect(svg.attrs.role).toBeUndefined();
    restore();
  });

  it("supports title accessibility", () => {
    const { svg, restore } = render({ title: "Home icon" });
    expect(svg.attrs["aria-hidden"]).toBe("false");
    expect(svg.attrs.role).toBe("img");
    expect(svg.children[0].tagName).toBe("title");
    expect(svg.children[0].textContent).toBe("Home icon");
    restore();
  });
});

