export type PrimitiveProps = {
  id?: string;
  class?: string;
  style?: string | Record<string, string | number>;
  children?: () => DocumentFragment;
  ref?: any;
  disabled?: boolean;
  forceMount?: boolean;
  asChild?: boolean;
  [key: string]: any;
};

export type FanxipanComponent = (
  target: Element,
  _ctx: unknown,
  props?: PrimitiveProps,
  children?: () => DocumentFragment
) => (() => void) | void;

