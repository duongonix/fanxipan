import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { accordionItemContext } from "./context.js";

export const Content: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const item = accordionItemContext.use();
  const el = document.createElement("div");
  if (props.class) el.className = props.class;
  const sync = () => {
    const open = item.getOpen();
    el.hidden = !open && !props.forceMount;
    el.setAttribute("data-state", open ? "open" : "closed");
  };
  sync();
  const off = item.subscribe(sync);
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { off(); if (el.parentNode === target) target.removeChild(el); };
};
