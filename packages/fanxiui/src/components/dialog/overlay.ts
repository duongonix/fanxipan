import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { dialogContext } from "./context.js";

export const Overlay: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}) => {
  const ctxx = dialogContext.use();
  const el = document.createElement("div");
  if (props.class) el.className = props.class;
  if (props.style) el.setAttribute("style", typeof props.style === "string" ? props.style : "");
  const sync = () => {
    const open = ctxx.getOpen();
    el.setAttribute("data-state", open ? "open" : "closed");
    el.hidden = !open && !props.forceMount;
  };
  sync();
  el.addEventListener("click", () => { if (ctxx.modal) ctxx.setOpen(false); });
  const off = ctxx.subscribe(sync);
  target.appendChild(el);
  return () => { off(); if (el.parentNode === target) target.removeChild(el); };
};
