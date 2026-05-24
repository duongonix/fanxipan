import { createComponentContext } from "../../internal/create-context.js";

export type SwitchContext = {
  getChecked: () => boolean;
  setChecked: (next: boolean) => void;
  subscribe: (run: () => void) => () => void;
  disabled: boolean;
};

export const switchContext = createComponentContext<SwitchContext>("Switch.Thumb");
