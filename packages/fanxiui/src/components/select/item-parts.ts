import type { FanxipanComponent, PrimitiveProps } from "../../types.js";

export const ItemText: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const el = document.createElement("span");
  if (props.class) el.className = props.class;
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { if (el.parentNode === target) target.removeChild(el); };
};

export const ItemIndicator: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const el = document.createElement("span");
  if (props.class) el.className = props.class;
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { if (el.parentNode === target) target.removeChild(el); };
};
