import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { progressContext } from "./context.js";

export const Indicator: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}) => {
  const ctxx = progressContext.use();
  const el = document.createElement("div");
  const pct = ctxx.max <= 0 ? 0 : Math.max(0, Math.min(100, (ctxx.value / ctxx.max) * 100));
  el.setAttribute("style", `transform:translateX(-${100 - pct}%);`);
  el.setAttribute("data-state", pct >= 100 ? "complete" : "loading");
  if (props.class) el.className = props.class;
  target.appendChild(el);
  return () => { if (el.parentNode === target) target.removeChild(el); };
};
