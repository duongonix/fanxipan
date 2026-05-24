import { createComponentContext } from "../../internal/create-context.js";

export type PopoverContext = {
  getOpen: () => boolean;
  setOpen: (next: boolean) => void;
  subscribe: (run: () => void) => () => void;
  triggerRef: { current: HTMLElement | null };
  contentRef: { current: HTMLElement | null };
};

export const popoverContext = createComponentContext<PopoverContext>("Popover.Trigger");
