import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { tabsContext } from "./context.js";

export const Content: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = tabsContext.use();
  const value = String(props.value ?? "");
  const el = document.createElement("div");
  el.setAttribute("role", "tabpanel");

  const sync = () => {
    const active = ctxx.getValue() === value;
    el.hidden = !active;
    el.setAttribute("data-state", active ? "active" : "inactive");
  };
  sync();
  const off = ctxx.subscribe(sync);
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { off(); if (el.parentNode === target) target.removeChild(el); };
};
