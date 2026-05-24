import { createComponentContext } from "../../internal/create-context.js";

export type CollapsibleContext = {
  getOpen: () => boolean;
  setOpen: (next: boolean) => void;
  subscribe: (run: () => void) => () => void;
  disabled: boolean;
};

export const collapsibleContext = createComponentContext<CollapsibleContext>("Collapsible.Trigger");
