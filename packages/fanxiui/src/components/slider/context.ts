import { createComponentContext } from "../../internal/create-context.js";

export type SliderContext = {
  getValue: () => number[];
  setValue: (next: number[]) => void;
  min: number;
  max: number;
  step: number;
  orientation: "horizontal" | "vertical";
  subscribe: (run: () => void) => () => void;
};

export const sliderContext = createComponentContext<SliderContext>("Slider.Track");
