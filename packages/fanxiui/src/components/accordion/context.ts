import { createComponentContext } from "../../internal/create-context.js";

export type AccordionContext = {
  type: "single" | "multiple";
  collapsible: boolean;
  orientation: "horizontal" | "vertical";
  getValue: () => string | string[];
  setValue: (next: string | string[]) => void;
  subscribe: (run: () => void) => () => void;
};

export type AccordionItemContext = {
  value: string;
  disabled: boolean;
  getOpen: () => boolean;
  subscribe: (run: () => void) => () => void;
  toggle: () => void;
  registerTrigger: (el: HTMLButtonElement) => void;
  unregisterTrigger: (el: HTMLButtonElement) => void;
  getTriggers: () => HTMLButtonElement[];
};

export const accordionContext = createComponentContext<AccordionContext>("Accordion.Item");
export const accordionItemContext = createComponentContext<AccordionItemContext>("Accordion.Trigger");
