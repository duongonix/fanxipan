import type { FanxipanComponent, PrimitiveProps } from "../../types.js";

export const Label: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const el = document.createElement("div");
  el.setAttribute("role", "presentation");
  if (props.class) el.className = props.class;
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { if (el.parentNode === target) target.removeChild(el); };
};

export const Separator: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}) => {
  const el = document.createElement("div");
  el.setAttribute("role", "separator");
  if (props.class) el.className = props.class;
  target.appendChild(el);
  return () => { if (el.parentNode === target) target.removeChild(el); };
};
