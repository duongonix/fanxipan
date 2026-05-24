import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { switchContext } from "./context.js";

export const Thumb: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = switchContext.use();
  const el = document.createElement("span");
  if (props.class) el.className = props.class;
  const sync = () => el.setAttribute("data-state", ctxx.getChecked() ? "checked" : "unchecked");
  sync();
  const off = ctxx.subscribe(sync);
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { off(); if (el.parentNode === target) target.removeChild(el); };
};
