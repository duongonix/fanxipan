import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { createControllableState } from "../../internal/controllable-state.js";
import { selectContext } from "./context.js";

export const Root: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const listeners = new Set<() => void>();
  const openState = createControllableState<boolean>({ prop: props.open, defaultProp: props.defaultOpen ?? false, onChange: props.onOpenChange });
  const valueState = createControllableState<string>({ prop: props.value, defaultProp: props.defaultValue ?? "", onChange: props.onValueChange });
  let selectedLabel = "";
  const items: Array<{ value: string; label: string; disabled: boolean; el: HTMLElement }> = [];

  const ctx = {
    getOpen: () => openState.get(),
    setOpen: (next: boolean) => { openState.set(next); for (const run of listeners) run(); },
    getValue: () => valueState.get(),
    setValue: (next: string) => { valueState.set(next); for (const run of listeners) run(); },
    getLabel: () => selectedLabel,
    setLabel: (next: string) => { selectedLabel = next; for (const run of listeners) run(); },
    subscribe: (run: () => void) => { listeners.add(run); return () => listeners.delete(run); },
    registerItem: (item: { value: string; label: string; disabled: boolean; el: HTMLElement }) => {
      items.push(item);
      if (item.value === valueState.get() && !selectedLabel) selectedLabel = item.label;
    },
    unregisterItem: (el: HTMLElement) => {
      const i = items.findIndex((x) => x.el === el);
      if (i >= 0) items.splice(i, 1);
    },
    getItems: () => items,
    triggerRef: { current: null as HTMLElement | null }
  };

  selectContext.set(ctx);
  if (children) target.appendChild(children());
  return () => listeners.clear();
};
