import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { createControllableState } from "../../internal/controllable-state.js";
import { radioGroupContext } from "./context.js";

export const Root: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const listeners = new Set<() => void>();
  const state = createControllableState<string>({
    prop: props.value,
    defaultProp: props.defaultValue ?? "",
    onChange: props.onValueChange
  });
  const ctx = {
    getValue: () => state.get(),
    setValue: (next: string) => { state.set(next); for (const run of listeners) run(); },
    subscribe: (run: () => void) => { listeners.add(run); return () => listeners.delete(run); },
    disabled: !!props.disabled,
    orientation: props.orientation ?? "vertical"
  };
  radioGroupContext.set(ctx);
  const el = document.createElement("div");
  el.setAttribute("role", "radiogroup");
  el.setAttribute("data-orientation", ctx.orientation);
  if (props.class) el.className = props.class;
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { listeners.clear(); if (el.parentNode === target) target.removeChild(el); };
};
