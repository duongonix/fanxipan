import type { FanxipanComponent, PrimitiveProps } from "../../types.js";

export const Separator: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}) => {
  const el = document.createElement("div");
  const orientation = props.orientation ?? "horizontal";
  el.setAttribute("role", "separator");
  el.setAttribute("data-orientation", orientation);
  if (props.class) el.className = props.class;
  target.appendChild(el);
  return () => { if (el.parentNode === target) target.removeChild(el); };
};
