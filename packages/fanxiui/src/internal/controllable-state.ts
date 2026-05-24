export function createControllableState<T>(opts: {
  prop?: T;
  defaultProp: T;
  onChange?: (next: T) => void;
}) {
  let inner = opts.defaultProp;
  const isControlled = () => opts.prop !== undefined;
  const get = () => (isControlled() ? (opts.prop as T) : inner);
  const set = (next: T) => {
    if (!isControlled()) inner = next;
    opts.onChange?.(next);
  };
  return { get, set, isControlled };
}

