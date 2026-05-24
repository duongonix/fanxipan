import { createComponentContext } from "../../internal/create-context.js";

export type MenuContext = {
  getOpen: () => boolean;
  setOpen: (next: boolean) => void;
  subscribe: (run: () => void) => () => void;
  onSelect?: (value: string) => void;
};

export const menuContext = createComponentContext<MenuContext>("Menu.Trigger");
