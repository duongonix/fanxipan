import { createComponentContext } from "../../internal/create-context.js";

export type ToggleGroupContext = {
  type: "single" | "multiple";
  getValue: () => string | string[];
  setValue: (next: string | string[]) => void;
  subscribe: (run: () => void) => () => void;
};

export const toggleGroupContext = createComponentContext<ToggleGroupContext>("ToggleGroup.Item");
