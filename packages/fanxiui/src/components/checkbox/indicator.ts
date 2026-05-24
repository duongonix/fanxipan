import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { checkboxContext } from "./context.js";

export const Indicator: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = checkboxContext.use();
  const span = document.createElement("span");
  if (props.class) span.className = props.class;
  const sync = () => {
    const checked = ctxx.getChecked();
    span.hidden = checked === false;
    span.setAttribute("data-state", checked === "indeterminate" ? "indeterminate" : checked ? "checked" : "unchecked");
  };
  sync();
  const off = ctxx.subscribe(sync);
  if (children) span.appendChild(children());
  target.appendChild(span);
  return () => { off(); if (span.parentNode === target) target.removeChild(span); };
};
