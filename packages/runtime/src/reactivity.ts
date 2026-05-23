import { flushSync, schedule } from "./internal/scheduler";

export type Cleanup = () => void;
type Subscriber = () => void;

let activeEffect: ReactiveEffect | null = null;
const globalRegistry = new Set<StateHandle<any>>();

class Signal<T> {
  private value: T;
  private subscribers = new Set<Subscriber>();

  constructor(initial: T) {
    this.value = initial;
  }

  get(): T {
    if (activeEffect) {
      activeEffect.track(this.subscribers);
    }
    return this.value;
  }

  set(next: T): void {
    if (Object.is(this.value, next)) return;
    this.value = next;
    for (const sub of this.subscribers) {
      schedule(sub);
    }
  }
}

class ReactiveEffect {
  private deps = new Set<Set<Subscriber>>();
  private cleanup: Cleanup | void = undefined;
  private stopped = false;

  constructor(private runFn: () => Cleanup | void) {}

  run = (): void => {
    if (this.stopped) return;
    this.teardownDeps();
    if (this.cleanup) this.cleanup();
    const prev = activeEffect;
    activeEffect = this;
    try {
      this.cleanup = this.runFn();
    } finally {
      activeEffect = prev;
    }
  };

  track(dep: Set<Subscriber>): void {
    dep.add(this.run);
    this.deps.add(dep);
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.teardownDeps();
    if (this.cleanup) this.cleanup();
    this.cleanup = undefined;
  }

  private teardownDeps(): void {
    for (const dep of this.deps) {
      dep.delete(this.run);
    }
    this.deps.clear();
  }
}

export interface StateHandle<T> {
  get: () => T;
  set: (next: T) => void;
  update: (updater: (value: T) => T) => void;
  subscribe: (run: (value: T) => void) => Cleanup;
}

export function state<T>(initial: T): StateHandle<T> {
  const sig = new Signal(initial);
  return {
    get: () => sig.get(),
    set: (next) => sig.set(next),
    update: (updater) => sig.set(updater(sig.get())),
    subscribe: (run) => {
      const stop = effect(() => {
        run(sig.get());
      });
      return stop;
    },
  };
}

export const $state = state;

export function derived<T>(compute: () => T): () => T {
  const value = state<T>(undefined as T);
  const stop = effect(() => {
    value.set(compute());
  });
  return () => {
    const out = value.get();
    return out;
  };
}

export const $derived = derived;

export function effect(run: () => Cleanup | void): Cleanup {
  const fx = new ReactiveEffect(run);
  fx.run();
  return () => fx.stop();
}

export const $effect = effect;

export function flushEffects(): void {
  flushSync();
}

export function globalState<T>(initial: T): StateHandle<T> {
  const value = state(initial);
  globalRegistry.add(value);
  return value;
}

export const $global = globalState;

export function readonly<T>(source: StateHandle<T>): Pick<StateHandle<T>, "get" | "subscribe"> {
  return {
    get: source.get,
    subscribe: source.subscribe,
  };
}

export function createSubscriber(start: (update: () => void) => Cleanup | void): () => void {
  const version = state(0);
  let stop: Cleanup | void;
  let count = 0;
  return () => {
    version.get();
    if (!activeEffect) return;
    count += 1;
    if (count === 1) {
      stop = start(() => version.update((n) => n + 1));
    }
    activeEffect.track(
      new Set<Subscriber>([
        () => {
          count = Math.max(0, count - 1);
          if (count === 0 && stop) {
            stop();
            stop = undefined;
          }
        },
      ]),
    );
  };
}

function createVersionSignal() {
  const version = state(0);
  return {
    read() {
      version.get();
    },
    bump() {
      version.update((n) => n + 1);
    },
  };
}

export class FanxiMap<K, V> extends Map<K, V> {
  #version = createVersionSignal();

  constructor(entries?: Iterable<readonly [K, V]> | null) {
    super();
    if (entries) {
      for (const [key, value] of entries) {
        super.set(key, value);
      }
    }
  }

  override get size(): number {
    this.#version.read();
    return super.size;
  }

  override get(key: K): V | undefined {
    this.#version.read();
    return super.get(key);
  }

  override has(key: K): boolean {
    this.#version.read();
    return super.has(key);
  }

  override set(key: K, value: V): this {
    const prev = super.get(key);
    super.set(key, value);
    if (!Object.is(prev, value)) this.#version.bump();
    return this;
  }

  override delete(key: K): boolean {
    const deleted = super.delete(key);
    if (deleted) this.#version.bump();
    return deleted;
  }

  override clear(): void {
    if (super.size === 0) return;
    super.clear();
    this.#version.bump();
  }

  override entries(): IterableIterator<[K, V]> {
    this.#version.read();
    return super.entries();
  }

  override keys(): IterableIterator<K> {
    this.#version.read();
    return super.keys();
  }

  override values(): IterableIterator<V> {
    this.#version.read();
    return super.values();
  }

  override [Symbol.iterator](): IterableIterator<[K, V]> {
    this.#version.read();
    return super[Symbol.iterator]();
  }
}

export class FanxiSet<T> extends Set<T> {
  #version = createVersionSignal();

  constructor(values?: Iterable<T> | null) {
    super();
    if (values) {
      for (const value of values) {
        super.add(value);
      }
    }
  }

  override get size(): number {
    this.#version.read();
    return super.size;
  }

  override has(value: T): boolean {
    this.#version.read();
    return super.has(value);
  }

  override add(value: T): this {
    const had = super.has(value);
    super.add(value);
    if (!had) this.#version.bump();
    return this;
  }

  override delete(value: T): boolean {
    const deleted = super.delete(value);
    if (deleted) this.#version.bump();
    return deleted;
  }

  override clear(): void {
    if (super.size === 0) return;
    super.clear();
    this.#version.bump();
  }

  override values(): IterableIterator<T> {
    this.#version.read();
    return super.values();
  }

  override [Symbol.iterator](): IterableIterator<T> {
    this.#version.read();
    return super[Symbol.iterator]();
  }
}

export class FanxiURL {
  #url: URL;
  #version = createVersionSignal();

  constructor(url: string | URL, base?: string | URL) {
    this.#url = new URL(url, base);
  }

  get href(): string {
    this.#version.read();
    return this.#url.href;
  }

  set href(value: string) {
    this.#url.href = value;
    this.#version.bump();
  }

  get pathname(): string {
    this.#version.read();
    return this.#url.pathname;
  }

  set pathname(value: string) {
    this.#url.pathname = value;
    this.#version.bump();
  }

  get search(): string {
    this.#version.read();
    return this.#url.search;
  }

  set search(value: string) {
    this.#url.search = value;
    this.#version.bump();
  }

  get searchParams(): URLSearchParams {
    this.#version.read();
    return this.#url.searchParams;
  }

  toString(): string {
    this.#version.read();
    return this.#url.toString();
  }
}

export class FanxiURLSearchParams {
  #params: URLSearchParams;
  #version = createVersionSignal();

  constructor(init?: string | URLSearchParams | Record<string, string> | string[][]) {
    this.#params = new URLSearchParams(init as any);
  }

  get(name: string): string | null {
    this.#version.read();
    return this.#params.get(name);
  }

  getAll(name: string): string[] {
    this.#version.read();
    return this.#params.getAll(name);
  }

  has(name: string): boolean {
    this.#version.read();
    return this.#params.has(name);
  }

  set(name: string, value: string): void {
    this.#params.set(name, value);
    this.#version.bump();
  }

  append(name: string, value: string): void {
    this.#params.append(name, value);
    this.#version.bump();
  }

  delete(name: string): void {
    this.#params.delete(name);
    this.#version.bump();
  }

  toString(): string {
    this.#version.read();
    return this.#params.toString();
  }
}

export class FanxiDate extends Date {
  #version = createVersionSignal();

  override getTime(): number {
    this.#version.read();
    return super.getTime();
  }

  override toISOString(): string {
    this.#version.read();
    return super.toISOString();
  }

  override setTime(time: number): number {
    const out = super.setTime(time);
    this.#version.bump();
    return out;
  }

  override setFullYear(year: number, month?: number, date?: number): number {
    const out = month === undefined ? super.setFullYear(year) : date === undefined ? super.setFullYear(year, month) : super.setFullYear(year, month, date);
    this.#version.bump();
    return out;
  }
}

type InspectFn = {
  <T>(value: T, label?: string): T;
  trace: (label?: string) => void;
};

export const inspect: InspectFn = Object.assign(
  <T>(value: T, label = "fanxipan:inspect"): T => {
    if (isProduction()) return value;
    console.debug(label, value);
    return value;
  },
  {
    trace(label = "fanxipan:trace") {
      if (!isProduction()) console.trace(label);
    },
  },
);

export const $inspect = inspect;

function isProduction(): boolean {
  return typeof process !== "undefined" && process.env?.NODE_ENV === "production";
}
