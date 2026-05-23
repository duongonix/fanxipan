export type Subscriber = () => void;

export function createSubscriptionStore() {
  const subscriptions = new Map<string, Set<Subscriber>>();
  const pendingDeps = new Set<string>();
  let pendingFlush = false;
  return {
    subscribeExpr(deps: string[], run: Subscriber): () => void {
      for (const dep of deps) {
        if (!subscriptions.has(dep)) subscriptions.set(dep, new Set());
        subscriptions.get(dep)!.add(run);
      }
      return () => {
        for (const dep of deps) {
          subscriptions.get(dep)?.delete(run);
        }
      };
    },
    flush(dep: string): void {
      pendingDeps.add(dep);
      if (pendingFlush) return;
      pendingFlush = true;
      queueMicrotask(() => {
        pendingFlush = false;
        const deps = Array.from(pendingDeps);
        pendingDeps.clear();
        const jobs = new Set<Subscriber>();
        for (const d of deps) {
          const set = subscriptions.get(d);
          if (!set) continue;
          for (const run of set) jobs.add(run);
        }
        for (const run of jobs) run();
      });
    },
    flushMany(deps: string[]): void {
      for (const dep of deps) {
        pendingDeps.add(dep);
      }
      if (pendingFlush) return;
      pendingFlush = true;
      queueMicrotask(() => {
        pendingFlush = false;
        const pending = Array.from(pendingDeps);
        pendingDeps.clear();
        const jobs = new Set<Subscriber>();
        for (const d of pending) {
          const set = subscriptions.get(d);
          if (!set) continue;
          for (const run of set) jobs.add(run);
        }
        for (const run of jobs) run();
      });
    },
    flushAll(): void {
      const jobs = new Set<Subscriber>();
      for (const set of subscriptions.values()) {
        for (const run of set) jobs.add(run);
      }
      for (const run of jobs) run();
    },
  };
}
