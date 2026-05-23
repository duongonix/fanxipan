import type { RouteManifest } from "./types.js";
import { matchManifestRoute } from "./match.js";
import { deserializeFromHtml } from "./serialization.js";

export interface NavigationState {
  path: string;
  params: Record<string, string>;
  routeId: string | null;
}

export interface NavigationLifecycle {
  from: NavigationState;
  to: NavigationState;
  type: "link" | "popstate" | "programmatic";
}

export interface ClientRuntimeOptions {
  restoreScroll?: boolean;
  onDevtoolsEvent?: (event: { type: string; payload?: Record<string, unknown> }) => void;
}

export interface ClientNavigator {
  navigate(to: string, options?: { replace?: boolean }): void;
  current(): NavigationState;
  subscribe(run: (value: NavigationState) => void): () => void;
  preloadCode(to: string): Promise<{ routeId: string | null }>;
  preloadData(to: string): Promise<unknown>;
  invalidate(keys?: string[]): void;
  markDepends(routeId: string, ...keys: string[]): void;
  beforeNavigate(run: (event: NavigationLifecycle) => void): () => void;
  afterNavigate(run: (event: NavigationLifecycle) => void): () => void;
  attachLinkInterception(root?: ParentNode): () => void;
  destroy(): void;
}

export interface HydrationRuntime {
  payload: unknown | null;
  hydrateRoute: (component: any, target?: Element | null) => Promise<() => void>;
}

export function createClientNavigator(manifest: RouteManifest, options: ClientRuntimeOptions = {}): ClientNavigator {
  const listeners = new Set<(value: NavigationState) => void>();
  const beforeListeners = new Set<(event: NavigationLifecycle) => void>();
  const afterListeners = new Set<(event: NavigationLifecycle) => void>();
  const routeDepends = new Map<string, Set<string>>();
  const dataCache = new Map<string, unknown>();
  const routeByPath = new Map<string, string>();
  const scrollByPath = new Map<string, { x: number; y: number }>();

  const readState = () => {
    if (typeof window === "undefined") {
      return { path: "/", params: {}, routeId: null };
    }
    const pathname = window.location.pathname || "/";
    const match = matchManifestRoute(manifest, pathname);
    return { path: pathname, params: match?.params ?? {}, routeId: match?.entry.id ?? null };
  };

  const emit = () => {
    const state = readState();
    for (const run of listeners) run(state);
  };

  const runAfter = (event: NavigationLifecycle) => {
    for (const run of afterListeners) run(event);
    options.onDevtoolsEvent?.({
      type: "fanxikit:navigation-end",
      payload: { from: event.from.path, to: event.to.path, routeId: event.to.routeId ?? "" },
    });
  };

  const onPop = () => {
    const from = readState();
    emit();
    const to = readState();
    if (options.restoreScroll !== false) {
      const pos = scrollByPath.get(to.path);
      if (pos && typeof window !== "undefined") window.scrollTo(pos.x, pos.y);
    }
    runAfter({ from, to, type: "popstate" });
  };

  const saveScroll = () => {
    if (typeof window === "undefined") return;
    scrollByPath.set(window.location.pathname || "/", { x: window.scrollX, y: window.scrollY });
  };

  if (typeof window !== "undefined") {
    window.addEventListener("popstate", onPop);
    window.addEventListener("beforeunload", saveScroll);
  }

  return {
    navigate(to, navOptions) {
      if (typeof window === "undefined") return;
      const from = readState();
      const target = new URL(to, window.location.origin);
      const toState = (() => {
        const match = matchManifestRoute(manifest, target.pathname);
        return { path: target.pathname, params: match?.params ?? {}, routeId: match?.entry.id ?? null };
      })();
      const lifecycle: NavigationLifecycle = { from, to: toState, type: "programmatic" };
      for (const run of beforeListeners) run(lifecycle);
      this.preloadCode(target.pathname).catch(() => {});
      saveScroll();
      if (navOptions?.replace) window.history.replaceState({}, "", target);
      else window.history.pushState({}, "", target);
      emit();
      if (navOptions?.replace !== true && options.restoreScroll !== false) {
        window.scrollTo(0, 0);
      }
      runAfter(lifecycle);
    },
    current() {
      return readState();
    },
    subscribe(run) {
      listeners.add(run);
      run(readState());
      return () => {
        listeners.delete(run);
      };
    },
    async preloadCode(to) {
      if (typeof window === "undefined") return { routeId: null };
      const target = new URL(to, window.location.origin);
      const match = matchManifestRoute(manifest, target.pathname);
      options.onDevtoolsEvent?.({
        type: "fanxikit:preload-code",
        payload: { path: target.pathname, routeId: match?.entry.id ?? "" },
      });
      return { routeId: match?.entry.id ?? null };
    },
    async preloadData(to) {
      if (typeof window === "undefined") return null;
      const target = new URL(to, window.location.origin);
      const key = target.pathname + target.search;
      if (dataCache.has(key)) return dataCache.get(key) ?? null;
      const response = await fetch(target, {
        headers: {
          "x-fanxikit-preload": "1",
          accept: "application/json, text/html;q=0.8, */*;q=0.2",
        },
      });
      const contentType = response.headers.get("content-type") ?? "";
      const data = contentType.includes("application/json") ? await response.json() : await response.text();
      dataCache.set(key, data);
      const match = matchManifestRoute(manifest, target.pathname);
      if (match?.entry.id) routeByPath.set(key, match.entry.id);
      options.onDevtoolsEvent?.({
        type: "fanxikit:preload-data",
        payload: { path: target.pathname, cached: false },
      });
      return data;
    },
    invalidate(keys = []) {
      if (keys.length === 0) {
        dataCache.clear();
        options.onDevtoolsEvent?.({ type: "fanxikit:invalidate-all" });
        return;
      }
      for (const [cacheKey, routeId] of routeByPath.entries()) {
        const depends = routeDepends.get(routeId);
        if (!depends) continue;
        if (keys.some((x) => depends.has(x))) dataCache.delete(cacheKey);
      }
      options.onDevtoolsEvent?.({
        type: "fanxikit:invalidate-keys",
        payload: { keys: keys.join(",") },
      });
    },
    markDepends(routeId, ...keys) {
      if (!routeDepends.has(routeId)) routeDepends.set(routeId, new Set());
      const bag = routeDepends.get(routeId)!;
      for (const key of keys) bag.add(key);
    },
    beforeNavigate(run) {
      beforeListeners.add(run);
      return () => void beforeListeners.delete(run);
    },
    afterNavigate(run) {
      afterListeners.add(run);
      return () => void afterListeners.delete(run);
    },
    attachLinkInterception(root = document) {
      const onClick = (event: Event) => {
        if (!(event instanceof MouseEvent)) return;
        if (event.defaultPrevented) return;
        if (event.button !== 0) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        const anchor = target.closest("a[href]");
        if (!anchor) return;
        const href = anchor.getAttribute("href");
        if (!href) return;
        if (href.startsWith("http://") || href.startsWith("https://")) return;
        if (href.startsWith("mailto:") || href.startsWith("tel:")) return;
        event.preventDefault();
        this.preloadCode(href).catch(() => {});
        this.navigate(href);
      };
      root.addEventListener("click", onClick);
      return () => root.removeEventListener("click", onClick);
    },
    destroy() {
      if (typeof window !== "undefined") {
        window.removeEventListener("popstate", onPop);
        window.removeEventListener("beforeunload", saveScroll);
      }
      listeners.clear();
      beforeListeners.clear();
      afterListeners.clear();
      routeDepends.clear();
      routeByPath.clear();
      dataCache.clear();
      scrollByPath.clear();
    },
  };
}

export function createHydrationRuntime(): HydrationRuntime {
  const payloadNode =
    typeof document !== "undefined"
      ? document.getElementById("__fanxikit_payload")
      : null;
  const payload =
    payloadNode?.textContent && payloadNode.textContent.trim().length > 0
      ? deserializeFromHtml(payloadNode.textContent)
      : null;

  return {
    payload,
    async hydrateRoute(component: any, target?: Element | null) {
      const mod = await import("fanxipan");
      const fanxipan = mod.default;
      const host = target ?? (typeof document !== "undefined" ? document.querySelector("#app") : null);
      return fanxipan.hydrate(component, host as Element | null, { clearTarget: false });
    },
  };
}
