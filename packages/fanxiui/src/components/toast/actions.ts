import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { toastContext } from "./context.js";

export const Action: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const btn = document.createElement("button");
  btn.type = "button";
  if (props.class) btn.className = props.class;
  btn.addEventListener("click", () => props.onAction?.());
  if (children) btn.appendChild(children());
  target.appendChild(btn);
  return () => { if (btn.parentNode === target) target.removeChild(btn); };
};

export const Close: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}) => {
  const ctxx = toastContext.use();
  const id = String(props.toastId ?? "");
  const btn = document.createElement("button");
  btn.type = "button";
  if (props.class) btn.className = props.class;
  btn.textContent = String(props.label ?? "Close");
  btn.addEventListener("click", () => {
    if (!id) return;
    ctxx.close(id);
    setTimeout(() => ctxx.remove(id), 120);
  });
  target.appendChild(btn);
  return () => { if (btn.parentNode === target) target.removeChild(btn); };
};
