import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { menuContext } from "./context.js";

export const Trigger: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = menuContext.use();
  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-haspopup", "menu");
  if (props.class) btn.className = props.class;
  const sync = () => {
    const open = ctxx.getOpen();
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("data-state", open ? "open" : "closed");
  };
  btn.addEventListener("click", () => ctxx.setOpen(!ctxx.getOpen()));
  sync();
  const off = ctxx.subscribe(sync);
  if (children) btn.appendChild(children());
  target.appendChild(btn);
  return () => { off(); if (btn.parentNode === target) target.removeChild(btn); };
};
