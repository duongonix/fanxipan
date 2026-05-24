import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { collapsibleContext } from "./context.js";

export const Trigger: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = collapsibleContext.use();
  const btn = document.createElement("button");
  btn.type = "button";
  if (props.class) btn.className = props.class;
  if (ctxx.disabled) btn.setAttribute("data-disabled", "");
  const sync = () => {
    const open = ctxx.getOpen();
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("data-state", open ? "open" : "closed");
  };
  sync();
  const off = ctxx.subscribe(sync);
  btn.addEventListener("click", () => { if (!ctxx.disabled) ctxx.setOpen(!ctxx.getOpen()); });
  if (children) btn.appendChild(children());
  target.appendChild(btn);
  return () => { off(); if (btn.parentNode === target) target.removeChild(btn); };
};
