import { createComponentContext } from "../../internal/create-context.js";

export type TabsContext = {
  getValue: () => string;
  setValue: (next: string) => void;
  subscribe: (run: () => void) => () => void;
  orientation: "horizontal" | "vertical";
  activationMode: "automatic" | "manual";
  registerTrigger: (el: HTMLButtonElement, value: string) => void;
  unregisterTrigger: (el: HTMLButtonElement) => void;
};

export const tabsContext = createComponentContext<TabsContext>("Tabs.Trigger");
