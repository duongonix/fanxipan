import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { createControllableState } from "../../internal/controllable-state.js";
import { tooltipContext } from "./context.js";

export const Provider: FanxipanComponent = (target, _ctx, _props: PrimitiveProps = {}, children) => {
  if (children) target.appendChild(children());
};

export const Root: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const listeners = new Set<() => void>();
  const state = createControllableState<boolean>({ prop: props.open, defaultProp: props.defaultOpen ?? false, onChange: props.onOpenChange });
  const ctx = {
    getOpen: () => state.get(),
    setOpen: (next: boolean) => { state.set(next); for (const run of listeners) run(); },
    subscribe: (run: () => void) => { listeners.add(run); return () => listeners.delete(run); },
    delayDuration: Number(props.delayDuration ?? 300)
  };
  tooltipContext.set(ctx);
  if (children) target.appendChild(children());
  return () => listeners.clear();
};
