import type { FanxipanComponent, PrimitiveProps } from "../../types.js";

export const Label: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const el = document.createElement("label");
  if (props.class) el.className = props.class;
  if (props.for) el.setAttribute("for", String(props.for));
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { if (el.parentNode === target) target.removeChild(el); };
};
