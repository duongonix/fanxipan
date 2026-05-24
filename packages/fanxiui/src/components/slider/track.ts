import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { sliderContext } from "./context.js";

export const Track: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = sliderContext.use();
  const el = document.createElement("div");
  el.setAttribute("data-orientation", ctxx.orientation);
  if (props.class) el.className = props.class;
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { if (el.parentNode === target) target.removeChild(el); };
};
