import type { FanxipanComponent, PrimitiveProps } from "../../types.js";

export const Arrow: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}) => {
  const el = document.createElement("div");
  if (props.class) el.className = props.class;
  target.appendChild(el);
  return () => { if (el.parentNode === target) target.removeChild(el); };
};
