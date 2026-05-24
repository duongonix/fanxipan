import { createComponentContext } from "../../internal/create-context.js";

export type DialogContext = {
  getOpen: () => boolean;
  setOpen: (next: boolean) => void;
  subscribe: (run: () => void) => () => void;
  triggerRef: { current: HTMLElement | null };
  contentRef: { current: HTMLElement | null };
  modal: boolean;
};

export const dialogContext = createComponentContext<DialogContext>("Dialog.Trigger");

