import { createComponentContext } from "../../internal/create-context.js";

export type RadioGroupContext = {
  getValue: () => string;
  setValue: (next: string) => void;
  subscribe: (run: () => void) => () => void;
  disabled: boolean;
  orientation: "horizontal" | "vertical";
};

export const radioGroupContext = createComponentContext<RadioGroupContext>("RadioGroup.Item");
