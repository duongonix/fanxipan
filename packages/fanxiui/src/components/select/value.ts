import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { selectContext } from "./context.js";

export const Value: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}) => {
  const ctxx = selectContext.use();
  const span = document.createElement("span");
  if (props.class) span.className = props.class;
  const placeholder = String(props.placeholder ?? "");
  const sync = () => {
    const label = ctxx.getLabel();
    span.textContent = label || placeholder;
    span.setAttribute("data-placeholder", label ? "false" : "true");
  };
  sync();
  const off = ctxx.subscribe(sync);
  target.appendChild(span);
  return () => { off(); if (span.parentNode === target) target.removeChild(span); };
};
