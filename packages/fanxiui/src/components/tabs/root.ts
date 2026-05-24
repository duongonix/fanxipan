import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { createControllableState } from "../../internal/controllable-state.js";
import { tabsContext } from "./context.js";

export const Root: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const listeners = new Set<() => void>();
  const state = createControllableState<string>({
    prop: props.value,
    defaultProp: props.defaultValue ?? ""
  });
  const items: Array<{ el: HTMLButtonElement; value: string }> = [];
  const ctx = {
    getValue: () => state.get(),
    setValue: (next: string) => { state.set(next); props.onValueChange?.(next); for (const run of listeners) run(); },
    subscribe: (run: () => void) => { listeners.add(run); return () => listeners.delete(run); },
    orientation: props.orientation ?? "horizontal",
    activationMode: props.activationMode ?? "automatic",
    registerTrigger: (el: HTMLButtonElement, value: string) => { items.push({ el, value }); },
    unregisterTrigger: (el: HTMLButtonElement) => {
      const idx = items.findIndex((x) => x.el === el);
      if (idx >= 0) items.splice(idx, 1);
    }
  };
  tabsContext.set(ctx);
  if (children) target.appendChild(children());
  return () => listeners.clear();
};
