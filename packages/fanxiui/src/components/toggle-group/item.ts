import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { toggleGroupContext } from "./context.js";

export const Item: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = toggleGroupContext.use();
  const value = String(props.value ?? "");
  const btn = document.createElement("button");
  btn.type = "button";
  if (props.class) btn.className = props.class;
  const isOn = () => ctxx.type === "single" ? ctxx.getValue() === value : Array.isArray(ctxx.getValue()) && (ctxx.getValue() as string[]).includes(value);
  const sync = () => {
    const on = isOn();
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("data-state", on ? "on" : "off");
  };
  btn.addEventListener("click", () => {
    if (ctxx.type === "single") {
      ctxx.setValue(isOn() ? "" : value);
    } else {
      const arr = Array.isArray(ctxx.getValue()) ? [...(ctxx.getValue() as string[])] : [];
      const i = arr.indexOf(value);
      if (i >= 0) arr.splice(i, 1); else arr.push(value);
      ctxx.setValue(arr);
    }
  });
  sync();
  const off = ctxx.subscribe(sync);
  if (children) btn.appendChild(children());
  target.appendChild(btn);
  return () => { off(); if (btn.parentNode === target) target.removeChild(btn); };
};
