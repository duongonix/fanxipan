import test from "node:test";
import assert from "node:assert/strict";
import { createIcon } from "../dist/runtime/create-icon.js";

function createFakeDom() {
  const makeEl = (tagName) => ({
    tagName,
    attrs: {},
    children: [],
    textContent: "",
    parentNode: null,
    setAttribute(k, v) { this.attrs[k] = v; },
    appendChild(el) { el.parentNode = this; this.children.push(el); },
    removeChild(el) { this.children = this.children.filter((x) => x !== el); el.parentNode = null; },
  });
  return {
    target: makeEl("div"),
    document: { createElementNS: (_ns, tag) => makeEl(tag) },
  };
}

function render(props = {}) {
  const { target, document } = createFakeDom();
  const previous = globalThis.document;
  globalThis.document = document;
  const Home = createIcon("Home", [["path", { d: "M0 0" }]]);
  Home(target, {}, props);
  const svg = target.children[0];
  globalThis.document = previous;
  return svg;
}

test("default props", () => {
  const svg = render();
  assert.equal(svg.attrs.width, "24");
  assert.equal(svg.attrs.stroke, "currentColor");
  assert.equal(svg.attrs["stroke-width"], "2");
});

test("size/color/strokeWidth props", () => {
  const svg = render({ size: 20, color: "#60a5fa", strokeWidth: 1.75 });
  assert.equal(svg.attrs.width, "20");
  assert.equal(svg.attrs.height, "20");
  assert.equal(svg.attrs.stroke, "#60a5fa");
  assert.equal(svg.attrs["stroke-width"], "1.75");
});

test("accessibility attrs", () => {
  const noTitle = render();
  assert.equal(noTitle.attrs["aria-hidden"], "true");
  const withTitle = render({ title: "Home icon" });
  assert.equal(withTitle.attrs["aria-hidden"], "false");
  assert.equal(withTitle.attrs.role, "img");
  assert.equal(withTitle.children[0].tagName, "title");
});

