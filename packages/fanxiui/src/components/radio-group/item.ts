import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { radioGroupContext } from "./context.js";

export const Item: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = radioGroupContext.use();
  const value = String(props.value ?? "");
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("role", "radio");
  if (props.class) el.className = props.class;
  const sync = () => {
    const selected = ctxx.getValue() === value;
    el.setAttribute("aria-checked", selected ? "true" : "false");
    el.setAttribute("data-state", selected ? "checked" : "unchecked");
    el.tabIndex = selected ? 0 : -1;
  };
  el.addEventListener("click", () => { if (!ctxx.disabled && !props.disabled) ctxx.setValue(value); });
  sync();
  const off = ctxx.subscribe(sync);
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { off(); if (el.parentNode === target) target.removeChild(el); };
};
