import {
  createRenderContext,
  runWithRenderContext,
  type CompiledComponentLike,
  type RenderMode,
} from "@fanxipan/runtime";

export interface RenderOptions {
  mode?: "render" | "hydrate";
  clearTarget?: boolean;
}

export interface fanxipanApi {
  render: (component: any, target: Element | null, options?: Omit<RenderOptions, "mode">) => () => void;
  hydrate: (component: any, target: Element | null, options?: Omit<RenderOptions, "mode">) => () => void;
  assertContract: (version: string) => void;
  version: string;
  contractVersion: string;
}

type fanxipanComponentLike = {
  (target: Element | null, ctx: unknown, props?: Record<string, unknown>, children?: unknown, mode?: RenderMode): any;
  __fanxipan_HMR_ID__?: string;
  __fanxipan_HMR_SNAPSHOT__?: () => unknown;
  __fanxipan_HMR_RESTORE__?: (snapshot: unknown) => void;
};

type HmrRecord = {
  target: Element;
  options: RenderOptions;
  component: fanxipanComponentLike | any;
  currentStop: () => void;
  snapshot?: unknown;
};

const hmrMounted: Map<string, HmrRecord> = (() => {
  const g = globalThis as any;
  if (!g.__fanxipan_HMR_MOUNTED__) {
    g.__fanxipan_HMR_MOUNTED__ = new Map<string, HmrRecord>();
  }
  return g.__fanxipan_HMR_MOUNTED__;
})();

declare global {
  interface Window {
    __fanxipan_HMR_APPLY__?: (id: string, next: any) => void;
  }
}

if (typeof globalThis !== "undefined") {
  (globalThis as any).__fanxipan_HMR_APPLY__ = (id: string, next: any) => {
    const rec = hmrMounted.get(id);
    if (!rec) return;
    if (typeof rec.component?.__fanxipan_HMR_SNAPSHOT__ === "function") {
      rec.snapshot = rec.component.__fanxipan_HMR_SNAPSHOT__();
    }
    rec.currentStop();
    rec.component = next;
    if (typeof rec.component?.__fanxipan_HMR_RESTORE__ === "function") {
      rec.component.__fanxipan_HMR_RESTORE__(rec.snapshot);
    }
    rec.currentStop = mountComponent(next, rec.target, rec.options);
  };
}

function ensureElementTarget(target: Element | null): Element | null {
  if (!target) {
    throw new TypeError("fanxipan target must be a valid Element");
  }
  if (typeof (target as Element).nodeType !== "number") {
    throw new TypeError("fanxipan target must be a valid Element");
  }
  return target;
}

function mountComponent(component: CompiledComponentLike | fanxipanComponentLike | any, target: Element | null, options: RenderOptions): () => void {
  const host = ensureElementTarget(target);
  if (!host) return () => {};
  if (options.mode === "render" && options.clearTarget !== false) {
    host.replaceChildren();
  }

  const ctx = createRenderContext();
  let destroyed = false;
  let cleanup: (() => void) | undefined;

  if (typeof component === "function") {
    const result = runWithRenderContext(ctx, () => component(host, ctx));
    if (typeof result === "function") {
      cleanup = result;
    } else if (result && typeof result.create === "function") {
      cleanup = runWithRenderContext(ctx, () => result.create(host, ctx, options.mode));
    }
  } else if (component && typeof component.create === "function") {
    cleanup = runWithRenderContext(ctx, () => component.create(host, ctx, options.mode));
  }

  return () => {
    if (destroyed) return;
    destroyed = true;
    cleanup?.();
    ctx.cleanupAll?.();
  };
}

function mountAndRegister(component: any, target: Element | null, options: RenderOptions): () => void {
  const host = ensureElementTarget(target);
  if (!host) return () => {};
  const stop = mountComponent(component, host, options);
  const hmrId = typeof component === "function" ? component.__fanxipan_HMR_ID__ : undefined;
  if (typeof hmrId === "string" && hmrId.length > 0) {
    hmrMounted.set(hmrId, {
      target: host,
      options,
      component,
      currentStop: stop,
    });
  }
  return () => {
    stop();
    if (typeof hmrId === "string") {
      hmrMounted.delete(hmrId);
    }
  };
}

const fanxipan: fanxipanApi = {
  render(component, target, options) {
    return mountAndRegister(component, target, { mode: "render", ...options });
  },
  hydrate(component, target, options) {
    return mountAndRegister(component, target, { mode: "hydrate", clearTarget: false, ...options });
  },
  assertContract(version) {
    if (version !== fanxipan_API_CONTRACT_VERSION) {
      throw new Error(
        `fanxipan API contract mismatch: expected ${fanxipan_API_CONTRACT_VERSION}, got ${version}`
      );
    }
  },
  version: "1.0.0",
  contractVersion: "1.0.0",
};

export default fanxipan;
export const fanxipan_API_CONTRACT_VERSION = "1.0.0";

export {
  $state,
  $derived,
  $effect,
  $global,
  $inspect,
  state,
  derived,
  effect,
  globalState,
  readonly,
  flushEffects,
  createSubscriber,
  FanxiMap,
  FanxiSet,
  FanxiURL,
  FanxiURLSearchParams,
  FanxiDate,
  inspect,
  provide,
  inject,
  mount,
  onMount,
  onUnmount,
  $mount,
  $unmount,
  $nextTick,
  nextTick,
  writable,
  readable,
  derivedStore,
} from "@fanxipan/runtime";


