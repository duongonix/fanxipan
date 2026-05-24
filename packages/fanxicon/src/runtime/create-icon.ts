import type { FanxipanComponent, IconProps } from "../types.js";
import { ICON_DEFAULTS } from "./icon-props.js";
import { normalizeIconProps } from "./normalize-props.js";

export type IconNode = [tagName: string, attrs: Record<string, string>];

const SVG_NS = "http://www.w3.org/2000/svg";
const OMITTED_PROP_KEYS = new Set([
  "size",
  "color",
  "strokeWidth",
  "absoluteStrokeWidth",
  "class",
  "style",
  "title",
  "ariaLabel",
]);

export function createIcon(name: string, nodes: IconNode[]): FanxipanComponent {
  const Icon: FanxipanComponent = (target, _ctx, props: IconProps = {}) => {
    const p = normalizeIconProps(props);
    const svg = document.createElementNS(SVG_NS, "svg");

    svg.setAttribute("xmlns", ICON_DEFAULTS.xmlns);
    svg.setAttribute("width", p.resolvedSize);
    svg.setAttribute("height", p.resolvedSize);
    svg.setAttribute("viewBox", ICON_DEFAULTS.viewBox);
    svg.setAttribute("fill", ICON_DEFAULTS.fill);
    svg.setAttribute("stroke", p.color ?? ICON_DEFAULTS.color);
    svg.setAttribute("stroke-width", p.computedStrokeWidth);
    svg.setAttribute("stroke-linecap", ICON_DEFAULTS.strokeLinecap);
    svg.setAttribute("stroke-linejoin", ICON_DEFAULTS.strokeLinejoin);

    if (p.id) svg.setAttribute("id", p.id);
    if (p.class) svg.setAttribute("class", p.class);
    if (p.style) svg.setAttribute("style", String(p.style));

    const role = p.role ?? (p.title || p.ariaLabel ? "img" : undefined);
    if (role) svg.setAttribute("role", role);
    if (p.title || p.ariaLabel) {
      svg.setAttribute("aria-hidden", "false");
      if (p.ariaLabel) svg.setAttribute("aria-label", p.ariaLabel);
    } else {
      svg.setAttribute("aria-hidden", "true");
    }

    if (p.title) {
      const title = document.createElementNS(SVG_NS, "title");
      title.textContent = p.title;
      svg.appendChild(title);
    }

    for (const [key, value] of Object.entries(p)) {
      if (OMITTED_PROP_KEYS.has(key)) continue;
      if (value == null) continue;
      if (key.startsWith("aria-") || key.startsWith("data-")) {
        svg.setAttribute(key, String(value));
      }
    }

    for (const [tag, attrs] of nodes) {
      const el = document.createElementNS(SVG_NS, tag);
      for (const [key, value] of Object.entries(attrs)) {
        el.setAttribute(key, value);
      }
      svg.appendChild(el);
    }

    target.appendChild(svg);

    return () => {
      if (svg.parentNode === target) target.removeChild(svg);
    };
  };

  Object.defineProperty(Icon, "name", { value: name, configurable: true });
  return Icon;
}
