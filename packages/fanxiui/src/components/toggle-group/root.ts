import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { createControllableState } from "../../internal/controllable-state.js";
import { toggleGroupContext } from "./context.js";

export const Root: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const listeners = new Set<() => void>();
  const type: "single" | "multiple" = props.type === "multiple" ? "multiple" : "single";
  const state = createControllableState<string | string[]>({
    prop: props.value,
    defaultProp: props.defaultValue ?? (type === "single" ? "" : []),
    onChange: props.onValueChange
  });
  const ctx = {
    type,
    getValue: () => state.get(),
    setValue: (next: string | string[]) => { state.set(next); for (const run of listeners) run(); },
    subscribe: (run: () => void) => { listeners.add(run); return () => listeners.delete(run); }
  };
  toggleGroupContext.set(ctx);
  const el = document.createElement("div");
  if (props.class) el.className = props.class;
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { listeners.clear(); if (el.parentNode === target) target.removeChild(el); };
};
