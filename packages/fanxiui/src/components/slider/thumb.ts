import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { sliderContext } from "./context.js";

export const Thumb: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}) => {
  const ctxx = sliderContext.use();
  const index = Number(props.index ?? 0);
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("role", "slider");
  if (props.class) el.className = props.class;

  const clamp = (n: number) => Math.max(ctxx.min, Math.min(ctxx.max, n));
  const sync = () => {
    const v = ctxx.getValue()[index] ?? ctxx.min;
    const pct = ((v - ctxx.min) / (ctxx.max - ctxx.min)) * 100;
    el.setAttribute("aria-valuenow", String(v));
    el.setAttribute("aria-valuemin", String(ctxx.min));
    el.setAttribute("aria-valuemax", String(ctxx.max));
    el.setAttribute("style", `left:${Math.max(0, Math.min(100, pct))}%;`);
  };

  el.addEventListener("keydown", (e) => {
    const v = ctxx.getValue()[index] ?? ctxx.min;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = clamp(v + ctxx.step);
      const arr = [...ctxx.getValue()]; arr[index] = next; ctxx.setValue(arr);
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = clamp(v - ctxx.step);
      const arr = [...ctxx.getValue()]; arr[index] = next; ctxx.setValue(arr);
    }
  });

  sync();
  const off = ctxx.subscribe(sync);
  target.appendChild(el);
  return () => { off(); if (el.parentNode === target) target.removeChild(el); };
};
