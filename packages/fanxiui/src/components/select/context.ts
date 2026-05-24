import { createComponentContext } from "../../internal/create-context.js";

export type SelectContext = {
  getOpen: () => boolean;
  setOpen: (next: boolean) => void;
  getValue: () => string;
  setValue: (next: string) => void;
  getLabel: () => string;
  setLabel: (next: string) => void;
  subscribe: (run: () => void) => () => void;
  registerItem: (item: { value: string; label: string; disabled: boolean; el: HTMLElement }) => void;
  unregisterItem: (el: HTMLElement) => void;
  getItems: () => Array<{ value: string; label: string; disabled: boolean; el: HTMLElement }>;
  triggerRef: { current: HTMLElement | null };
};

export const selectContext = createComponentContext<SelectContext>("Select.Trigger");
