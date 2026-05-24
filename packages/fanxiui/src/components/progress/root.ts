import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { progressContext } from "./context.js";

export const Root: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const max = Number(props.max ?? 100);
  const value = Number(props.value ?? 0);
  const el = document.createElement("div");
  el.setAttribute("role", "progressbar");
  el.setAttribute("aria-valuemin", "0");
  el.setAttribute("aria-valuemax", String(max));
  el.setAttribute("aria-valuenow", String(value));
  el.setAttribute("data-state", value >= max ? "complete" : "loading");
  if (props.class) el.className = props.class;
  progressContext.set({ value, max });
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { if (el.parentNode === target) target.removeChild(el); };
};
