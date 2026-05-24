import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { sliderContext } from "./context.js";

export const Range: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}) => {
  const ctxx = sliderContext.use();
  const el = document.createElement("div");
  if (props.class) el.className = props.class;
  const sync = () => {
    const v = ctxx.getValue()[0] ?? ctxx.min;
    const pct = ((v - ctxx.min) / (ctxx.max - ctxx.min)) * 100;
    el.setAttribute("style", `width:${Math.max(0, Math.min(100, pct))}%;`);
  };
  sync();
  const off = ctxx.subscribe(sync);
  target.appendChild(el);
  return () => { off(); if (el.parentNode === target) target.removeChild(el); };
};
