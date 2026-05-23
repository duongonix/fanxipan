import type { RouteSnapshot, RouteState } from "./types.js";

export function createRouteState(initial: RouteSnapshot): {
  route: RouteState;
  set: (next: RouteSnapshot) => void;
} {
  let current = initial;
  const subs = new Set<(next: RouteSnapshot) => void>();

  const route = new Proxy(
    {
      subscribe(run: (next: RouteSnapshot) => void) {
        subs.add(run);
        return () => subs.delete(run);
      },
    } as unknown as RouteState,
    {
      get(_target, prop) {
        if (prop === "subscribe") {
          return (run: (next: RouteSnapshot) => void) => {
            subs.add(run);
            return () => subs.delete(run);
          };
        }
        return (current as any)[prop];
      },
      ownKeys() {
        return Reflect.ownKeys(current);
      },
      getOwnPropertyDescriptor() {
        return { enumerable: true, configurable: true };
      },
    }
  );

  return {
    route,
    set(next) {
      current = next;
      for (const sub of subs) sub(current);
    },
  };
}
