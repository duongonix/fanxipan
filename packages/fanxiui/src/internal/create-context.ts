import { inject, provide } from "fanxipan";

export function createComponentContext<T>(name: string) {
  const key = Symbol(`fanxiui:${name}`);
  const use = () => {
    const value = inject<T | undefined>(key, undefined);
    if (!value) throw new Error(`${name} must be used within ${name.split(".")[0]}.Root.`);
    return value;
  };
  const set = (value: T) => provide(key, value);
  return { use, set, key };
}

