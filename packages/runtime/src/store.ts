export type Unsubscriber = () => void;
export type Subscriber<T> = (value: T) => void;
export type Invalidator<T> = (value?: T) => void;
export type Updater<T> = (value: T) => T;
export type StartStopNotifier<T> = (set: (value: T) => void) => void | Unsubscriber;

export interface Readable<T> {
  subscribe(this: void, run: Subscriber<T>, invalidate?: Invalidator<T>): Unsubscriber;
}

export interface Writable<T> extends Readable<T> {
  set(this: void, value: T): void;
  update(this: void, updater: Updater<T>): void;
}

type Setter<T> = (value: T) => void;

const noop = () => {};

export function writable<T>(value: T, start: StartStopNotifier<T> = noop): Writable<T> {
  let stop: void | Unsubscriber;
  const subscribers = new Set<[Subscriber<T>, Invalidator<T>]>();

  const set: Setter<T> = (next) => {
    if (Object.is(value, next)) return;
    value = next;
    if (!stop) return;
    for (const [run, invalidate] of subscribers) {
      invalidate();
      run(value);
    }
  };

  const update = (updater: Updater<T>): void => {
    set(updater(value));
  };

  const subscribe = (run: Subscriber<T>, invalidate: Invalidator<T> = noop): Unsubscriber => {
    const entry: [Subscriber<T>, Invalidator<T>] = [run, invalidate];
    subscribers.add(entry);
    if (subscribers.size === 1) {
      stop = start(set) || noop;
    }
    run(value);
    return () => {
      subscribers.delete(entry);
      if (subscribers.size === 0) {
        stop?.();
        stop = undefined;
      }
    };
  };

  return { set, update, subscribe };
}

export function readable<T>(value: T, start: StartStopNotifier<T> = noop): Readable<T> {
  return {
    subscribe: writable(value, start).subscribe,
  };
}

type Stores = Readable<any> | ReadonlyArray<Readable<any>>;

type StoresValues<S> = S extends Readable<infer T>
  ? T
  : S extends ReadonlyArray<Readable<any>>
    ? { [K in keyof S]: S[K] extends Readable<infer U> ? U : never }
    : never;

type DerivedSetter<T> = (value: T) => void;
type DerivedUpdater<T> = (updater: Updater<T>) => void;
type DerivedFn<S, T> =
  | ((values: StoresValues<S>) => T)
  | ((values: StoresValues<S>, set: DerivedSetter<T>, update: DerivedUpdater<T>) => void | Unsubscriber);

export function derived<S extends Stores, T>(
  stores: S,
  fn: DerivedFn<S, T>,
  initialValue?: T,
): Readable<T> {
  const single = !Array.isArray(stores);
  const storesArray = (single ? [stores] : stores) as Array<Readable<any>>;
  const auto = fn.length < 2;

  return readable(initialValue as T, (set) => {
    let inited = false;
    const values: any[] = [];
    let pending = 0;
    let cleanup: void | Unsubscriber;
    let current = initialValue as T;
    const setCurrent = (value: T): void => {
      current = value;
      set(value);
    };

    const sync = (): void => {
      if (pending) return;
      cleanup?.();
      const input = (single ? values[0] : values) as StoresValues<S>;
      const result = (fn as any)(input, setCurrent, (updater: Updater<T>) => {
        setCurrent(updater(current));
      });
      if (auto) {
        setCurrent(result as T);
      } else {
        cleanup = result as void | Unsubscriber;
      }
    };

    const unsubs = storesArray.map((store, i) =>
      store.subscribe(
        (value) => {
          values[i] = value;
          pending &= ~(1 << i);
          if (inited) sync();
        },
        () => {
          pending |= 1 << i;
        },
      ),
    );

    inited = true;
    sync();

    return () => {
      for (const unsub of unsubs) unsub();
      cleanup?.();
    };
  });
}
