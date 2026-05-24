import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { createControllableState } from "../../internal/controllable-state.js";
import { dialogContext } from "./context.js";

export const Root: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const listeners = new Set<() => void>();
  const state = createControllableState<boolean>({
    prop: props.open,
    defaultProp: props.defaultOpen ?? false,
    onChange: props.onOpenChange
  });
  const triggerRef = { current: null as HTMLElement | null };
  const contentRef = { current: null as HTMLElement | null };
  const ctx = {
    getOpen: () => state.get(),
    setOpen: (next: boolean) => {
      state.set(next);
      for (const run of listeners) run();
    },
    subscribe: (run: () => void) => {
      listeners.add(run);
      return () => listeners.delete(run);
    },
    triggerRef,
    contentRef,
    modal: props.modal ?? true
  };

  dialogContext.set(ctx);
  if (children) target.appendChild(children());
  return () => { listeners.clear(); };
};
