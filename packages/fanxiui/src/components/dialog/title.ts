import type { FanxipanComponent, PrimitiveProps } from "../../types.js";

export const Title: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const el = document.createElement("h2");
  if (props.id) el.id = props.id;
  if (props.class) el.className = props.class;
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { if (el.parentNode === target) target.removeChild(el); };
};
