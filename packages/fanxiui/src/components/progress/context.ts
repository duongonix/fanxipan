import { createComponentContext } from "../../internal/create-context.js";

export type ProgressContext = {
  value: number;
  max: number;
};

export const progressContext = createComponentContext<ProgressContext>("Progress.Indicator");
