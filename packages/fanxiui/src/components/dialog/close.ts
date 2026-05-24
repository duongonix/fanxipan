import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { dialogContext } from "./context.js";

export const Close: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = dialogContext.use();
  const button = document.createElement("button");
  button.type = "button";
  if (props.class) button.className = props.class;
  button.addEventListener("click", () => ctxx.setOpen(false));
  if (children) button.appendChild(children());
  target.appendChild(button);
  return () => { if (button.parentNode === target) target.removeChild(button); };
};
