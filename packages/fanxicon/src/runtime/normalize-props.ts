import type { IconProps } from "../types.js";
import { ICON_DEFAULTS, type NormalizedIconProps } from "./icon-props.js";

function normalizeStyle(style: IconProps["style"]): string | undefined {
  if (style == null) return undefined;
  if (typeof style === "string") return style;
  const items = Object.entries(style).map(([key, value]) => `${key}:${String(value)}`);
  return items.join(";");
}

export function normalizeIconProps(props: IconProps = {}): NormalizedIconProps {
  const size = props.size ?? ICON_DEFAULTS.size;
  const strokeWidth = props.strokeWidth ?? ICON_DEFAULTS.strokeWidth;
  const sizeNumber = typeof size === "number" ? size : Number(size);
  const strokeNumber = typeof strokeWidth === "number" ? strokeWidth : Number(strokeWidth);
  const computedStrokeWidth =
    props.absoluteStrokeWidth && Number.isFinite(sizeNumber) && sizeNumber > 0 && Number.isFinite(strokeNumber)
      ? ((strokeNumber * 24) / sizeNumber).toString()
      : String(strokeWidth);

  const normalized: NormalizedIconProps = {
    ...props,
    size,
    color: props.color ?? ICON_DEFAULTS.color,
    strokeWidth,
    computedStrokeWidth,
    resolvedSize: String(size),
    style: normalizeStyle(props.style),
    title: props.title ?? undefined,
    ariaLabel: props.ariaLabel ?? undefined,
  };
  return normalized;
}
