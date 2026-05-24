export type IconProps = {
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
  class?: string;
  style?: string | Record<string, string | number>;
  title?: string;
  ariaLabel?: string;
  role?: string;
  id?: string;
  [key: string]: any;
};

export type FanxipanComponent = (
  target: Element,
  _ctx: unknown,
  props?: IconProps
) => () => void;

