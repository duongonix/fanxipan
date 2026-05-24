import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { createControllableState } from "../../internal/controllable-state.js";
import { sliderContext } from "./context.js";

export const Root: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const listeners = new Set<() => void>();
  const min = Number(props.min ?? 0);
  const max = Number(props.max ?? 100);
  const step = Number(props.step ?? 1);
  const state = createControllableState<number[]>({
    prop: props.value,
    defaultProp: Array.isArray(props.defaultValue) ? props.defaultValue : [props.defaultValue ?? min],
    onChange: props.onValueChange
  });
  const ctx = {
    getValue: () => state.get(),
    setValue: (next: number[]) => { state.set(next); for (const run of listeners) run(); },
    min, max, step,
    orientation: props.orientation ?? "horizontal",
    subscribe: (run: () => void) => { listeners.add(run); return () => listeners.delete(run); }
  };
  sliderContext.set(ctx);
  const el = document.createElement("div");
  el.setAttribute("data-orientation", ctx.orientation);
  if (props.class) el.className = props.class;
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { listeners.clear(); if (el.parentNode === target) target.removeChild(el); };
};
