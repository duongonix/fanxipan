import type { FanxipanComponent, PrimitiveProps } from "../../types.js";

export const Viewport: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const el = document.createElement("div");
  el.setAttribute("data-part", "toast-viewport");
  if (props.class) el.className = props.class;
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { if (el.parentNode === target) target.removeChild(el); };
};
