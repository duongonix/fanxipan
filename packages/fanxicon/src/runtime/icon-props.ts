import type { IconProps } from "../types.js";

export const ICON_DEFAULTS = {
  size: 24,
  color: "currentColor",
  strokeWidth: 2,
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  xmlns: "http://www.w3.org/2000/svg",
} as const;

export type NormalizedIconProps = IconProps & {
  computedStrokeWidth: string;
  resolvedSize: string;
  title?: string;
  ariaLabel?: string;
};
