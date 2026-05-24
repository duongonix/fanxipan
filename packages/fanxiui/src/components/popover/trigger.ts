import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { popoverContext } from "./context.js";

export const Trigger: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = popoverContext.use();
  const btn = document.createElement("button");
  btn.type = "button";
  if (props.class) btn.className = props.class;
  const sync = () => {
    const open = ctxx.getOpen();
    btn.setAttribute("data-state", open ? "open" : "closed");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  };
  btn.addEventListener("click", () => ctxx.setOpen(!ctxx.getOpen()));
  sync();
  const off = ctxx.subscribe(sync);
  if (children) btn.appendChild(children());
  target.appendChild(btn);
  ctxx.triggerRef.current = btn;
  return () => { off(); if (ctxx.triggerRef.current === btn) ctxx.triggerRef.current = null; if (btn.parentNode === target) target.removeChild(btn); };
};
