import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { collapsibleContext } from "./context.js";

export const Content: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = collapsibleContext.use();
  const el = document.createElement("div");
  if (props.class) el.className = props.class;
  const sync = () => {
    const open = ctxx.getOpen();
    el.hidden = !open && !props.forceMount;
    el.setAttribute("data-state", open ? "open" : "closed");
  };
  sync();
  const off = ctxx.subscribe(sync);
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { off(); if (el.parentNode === target) target.removeChild(el); };
};
