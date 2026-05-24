import type { FanxipanComponent, PrimitiveProps } from "../../types.js";

export const VisuallyHidden: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const el = document.createElement("span");
  el.setAttribute("style", "position:absolute;border:0;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;");
  if (props.class) el.className = props.class;
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { if (el.parentNode === target) target.removeChild(el); };
};
