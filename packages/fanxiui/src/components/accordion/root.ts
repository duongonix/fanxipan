import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { createControllableState } from "../../internal/controllable-state.js";
import { accordionContext } from "./context.js";

export const Root: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const type: "single" | "multiple" = props.type === "multiple" ? "multiple" : "single";
  const listeners = new Set<() => void>();
  const state = createControllableState<string | string[]>({
    prop: props.value,
    defaultProp: props.defaultValue ?? (type === "single" ? "" : []),
    onChange: props.onValueChange
  });

  const ctx = {
    type,
    collapsible: props.collapsible ?? false,
    orientation: props.orientation ?? "vertical",
    getValue: () => state.get(),
    setValue: (next: string | string[]) => { state.set(next); for (const run of listeners) run(); },
    subscribe: (run: () => void) => { listeners.add(run); return () => listeners.delete(run); }
  };
  accordionContext.set(ctx);
  const el = document.createElement("div");
  el.setAttribute("data-orientation", ctx.orientation);
  if (props.class) el.className = props.class;
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { listeners.clear(); if (el.parentNode === target) target.removeChild(el); };
};
