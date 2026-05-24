import { createComponentContext } from "../../internal/create-context.js";

export type TooltipContext = {
  getOpen: () => boolean;
  setOpen: (next: boolean) => void;
  subscribe: (run: () => void) => () => void;
  delayDuration: number;
};

export const tooltipContext = createComponentContext<TooltipContext>("Tooltip.Trigger");
