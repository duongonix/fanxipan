import { createComponentContext } from "../../internal/create-context.js";

export type CheckedState = boolean | "indeterminate";
export type CheckboxContext = {
  getChecked: () => CheckedState;
  setChecked: (next: CheckedState) => void;
  subscribe: (run: () => void) => () => void;
  disabled: boolean;
};

export const checkboxContext = createComponentContext<CheckboxContext>("Checkbox.Indicator");
