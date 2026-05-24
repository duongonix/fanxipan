import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { createControllableState } from "../../internal/controllable-state.js";
import { popoverContext } from "./context.js";

export const Root: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const listeners = new Set<() => void>();
  const state = createControllableState<boolean>({ prop: props.open, defaultProp: props.defaultOpen ?? false, onChange: props.onOpenChange });
  const ctx = {
    getOpen: () => state.get(),
    setOpen: (next: boolean) => { state.set(next); for (const run of listeners) run(); },
    subscribe: (run: () => void) => { listeners.add(run); return () => listeners.delete(run); },
    triggerRef: { current: null as HTMLElement | null },
    contentRef: { current: null as HTMLElement | null }
  };
  popoverContext.set(ctx);
  if (children) target.appendChild(children());
  return () => listeners.clear();
};
