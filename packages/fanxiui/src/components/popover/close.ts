import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { popoverContext } from "./context.js";

export const Close: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = popoverContext.use();
  const btn = document.createElement("button");
  btn.type = "button";
  if (props.class) btn.className = props.class;
  btn.addEventListener("click", () => ctxx.setOpen(false));
  if (children) btn.appendChild(children());
  target.appendChild(btn);
  return () => { if (btn.parentNode === target) target.removeChild(btn); };
};
