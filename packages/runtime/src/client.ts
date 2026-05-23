import { applyScopedClass } from "./dom";
import { runMountHooks, runUnmountHooks } from "./lifecycle";
import { createSubscriptionStore, type Subscriber } from "./internal/subscriptions";

export interface RenderContext {
  parent?: RenderContext;
  contexts: Map<unknown, unknown>;
  subscribeExpr: (deps: string[], run: Subscriber) => () => void;
  mountComponent: (
    component: unknown,
    anchor: Comment,
    props: Record<string, unknown>,
    children: () => DocumentFragment,
    mode?: "render" | "hydrate"
  ) => void;
  applyScopedClass: (el: Element, scopeId: string) => void;
  listen: (
    el: EventTarget,
    type: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions
  ) => () => void;
  listenDelegated: (
    el: Element,
    type: string,
    handler: EventListener,
    options?: { once?: boolean }
  ) => () => void;
  onCleanup: (cleanup: () => void) => void;
  cleanupAll: () => void;
  notify: (dep: string) => void;
  notifyMany: (deps: string[]) => void;
  flushAll: () => void;
}

type DelegatedSlot = {
  el: Element;
  fn: EventListener;
  once: boolean;
  called: boolean;
};

type DelegatedBucket = {
  root: Element | Document;
  byElement: Map<Element, Set<DelegatedSlot>>;
};

let currentContext: RenderContext | null = null;
const rootContextValues = new Map<unknown, unknown>();

export function createRenderContext(parent?: RenderContext): RenderContext {
  const store = createSubscriptionStore();
  const cleanups: Array<() => void> = [];
  const delegatedByType = new Map<string, { listener: EventListener; buckets: Set<DelegatedBucket> }>();

  const renderContext: RenderContext = {
    parent,
    contexts: new Map(),
    subscribeExpr: store.subscribeExpr,
    mountComponent(component, anchor, props, children, mode = "render") {
      const mountPoint = document.createElement("span");
      mountPoint.setAttribute("data-fanxipan-cmp", "");
      anchor.parentNode?.insertBefore(mountPoint, anchor.nextSibling);
      let componentCleanup: (() => void) | undefined;
      if (typeof component === "function") {
        const childCtx = createRenderContext(renderContext);
        const out = runWithRenderContext(childCtx, () => (component as any)(mountPoint, childCtx, props, children, mode));
        if (typeof out === "function") {
          componentCleanup = out;
        }
      }
      if (!componentCleanup) {
        const childFrag = children();
        if (childFrag.childNodes.length > 0) {
          mountPoint.appendChild(childFrag);
        }
      }
      runMountHooks();
      const observer = new MutationObserver(() => {
        if (!anchor.isConnected || !mountPoint.isConnected) {
          componentCleanup?.();
          runUnmountHooks();
          observer.disconnect();
        }
      });
      if (mountPoint.parentNode) {
        observer.observe(mountPoint.parentNode, { childList: true });
        cleanups.push(() => {
          componentCleanup?.();
          observer.disconnect();
          if (mountPoint.parentNode) {
            mountPoint.parentNode.removeChild(mountPoint);
          }
        });
      }
    },
    applyScopedClass,
    listen(el, type, handler, options) {
      el.addEventListener(type, handler, options);
      return () => el.removeEventListener(type, handler, options);
    },
    listenDelegated(el, type, handler, options) {
      if (!(el instanceof Element)) return () => {};
      const once = !!options?.once;
      const slot: DelegatedSlot = { el, fn: handler, once, called: false };
      const root = findDelegationRoot(el);

      let entry = delegatedByType.get(type);
      if (!entry) {
        const buckets = new Set<DelegatedBucket>();
        const listener: EventListener = (event) => {
          const path = event.composedPath?.() ?? buildPath(event.target as Node | null);
          const pathEls = path.filter((x): x is Element => x instanceof Element);
          if (pathEls.length === 0) return;

          for (const bucket of Array.from(buckets)) {
            if (bucket.root instanceof Element) {
              const hitRoot = pathEls.some((p) => bucket.root === p || bucket.root.contains(p));
              if (!hitRoot) continue;
            }
            const touched = new Set<DelegatedSlot>();
            for (const p of pathEls) {
              const set = bucket.byElement.get(p);
              if (!set) continue;
              for (const s of set) touched.add(s);
            }
            for (const s of touched) {
              if (s.once && s.called) continue;
              s.fn(event);
              if (s.once) {
                s.called = true;
                removeDelegatedSlot(bucket, s);
              }
            }
            if (bucket.byElement.size === 0) {
              buckets.delete(bucket);
            }
          }

          if (buckets.size === 0) {
            document.removeEventListener(type, listener);
            delegatedByType.delete(type);
          }
        };
        document.addEventListener(type, listener);
        entry = { listener, buckets };
        delegatedByType.set(type, entry);
      }

      let bucket: DelegatedBucket | undefined;
      for (const b of entry.buckets) {
        if (b.root === root) {
          bucket = b;
          break;
        }
      }
      if (!bucket) {
        bucket = { root, byElement: new Map() };
        entry.buckets.add(bucket);
      }
      if (!bucket.byElement.has(el)) {
        bucket.byElement.set(el, new Set());
      }
      bucket.byElement.get(el)!.add(slot);

      return () => {
        const e = delegatedByType.get(type);
        if (!e) return;
        for (const b of e.buckets) {
          if (b.root !== root) continue;
          removeDelegatedSlot(b, slot);
          if (b.byElement.size === 0) {
            e.buckets.delete(b);
          }
          break;
        }
        if (e.buckets.size === 0) {
          document.removeEventListener(type, e.listener);
          delegatedByType.delete(type);
        }
      };
    },
    onCleanup(cleanup) {
      cleanups.push(cleanup);
    },
    cleanupAll() {
      for (const cleanup of cleanups.splice(0)) cleanup();
    },
    notify(dep) {
      store.flush(dep);
    },
    notifyMany(deps) {
      store.flushMany(deps);
    },
    flushAll() {
      store.flushAll();
    },
  };
  return renderContext;
}

export function runWithRenderContext<T>(ctx: RenderContext, run: () => T): T {
  const prev = currentContext;
  currentContext = ctx;
  try {
    return run();
  } finally {
    currentContext = prev;
  }
}

export function getCurrentRenderContext(): RenderContext | null {
  return currentContext;
}

export function provide<T>(key: unknown, value: T): T {
  const ctx = currentContext;
  if (ctx) {
    ctx.contexts.set(key, value);
  } else {
    rootContextValues.set(key, value);
  }
  return value;
}

export function inject<T>(key: unknown, fallback?: T): T {
  let ctx = currentContext;
  while (ctx) {
    if (ctx.contexts.has(key)) return ctx.contexts.get(key) as T;
    ctx = ctx.parent ?? null;
  }
  if (rootContextValues.has(key)) return rootContextValues.get(key) as T;
  return fallback as T;
}

function findDelegationRoot(el: Element): Element | Document {
  return el.closest("[data-fanxipan-cmp]") ?? document;
}

function removeDelegatedSlot(bucket: DelegatedBucket, slot: DelegatedSlot) {
  const set = bucket.byElement.get(slot.el);
  if (!set) return;
  set.delete(slot);
  if (set.size === 0) bucket.byElement.delete(slot.el);
}

function buildPath(target: Node | null): EventTarget[] {
  const out: EventTarget[] = [];
  let cur: Node | null = target;
  while (cur) {
    out.push(cur);
    cur = cur.parentNode;
  }
  out.push(document);
  out.push(window);
  return out;
}


