import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { tooltipContext } from "./context.js";

export const Trigger: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = tooltipContext.use();
  const el = document.createElement("button");
  el.type = "button";
  if (props.class) el.className = props.class;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const openSoon = () => { timer = setTimeout(() => ctxx.setOpen(true), ctxx.delayDuration); };
  const closeNow = () => { if (timer) clearTimeout(timer); ctxx.setOpen(false); };
  el.addEventListener("mouseenter", openSoon);
  el.addEventListener("mouseleave", closeNow);
  el.addEventListener("focus", openSoon);
  el.addEventListener("blur", closeNow);
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { if (timer) clearTimeout(timer); if (el.parentNode === target) target.removeChild(el); };
};
