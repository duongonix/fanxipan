import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { dialogContext } from "./context.js";

export const Trigger: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = dialogContext.use();
  const button = document.createElement("button");
  button.type = "button";
  if (props.id) button.id = props.id;
  if (props.class) button.className = props.class;
  if (props.style) button.setAttribute("style", typeof props.style === "string" ? props.style : "");
  button.setAttribute("aria-haspopup", "dialog");

  const sync = () => {
    const open = ctxx.getOpen();
    button.setAttribute("data-state", open ? "open" : "closed");
    button.setAttribute("aria-expanded", open ? "true" : "false");
  };
  sync();

  button.addEventListener("click", () => ctxx.setOpen(!ctxx.getOpen()));
  const off = ctxx.subscribe(sync);
  if (children) button.appendChild(children());
  target.appendChild(button);
  ctxx.triggerRef.current = button;

  return () => { off(); if (ctxx.triggerRef.current === button) ctxx.triggerRef.current = null; if (button.parentNode === target) target.removeChild(button); };
};
