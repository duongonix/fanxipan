import { makeIsActive } from "./active.js";
import { currentUrl } from "./history.js";
import { installLinkInterceptor } from "./intercept.js";
import { diffLayoutChain } from "./layout.js";
import { matchRoute } from "./matcher.js";
import { navigateTo } from "./navigation.js";
import { normalizeRoutes } from "./normalize.js";
import { parseQuery } from "./query.js";
import { createRouteState } from "./route-state.js";
import type { RouteConfig, RouteSnapshot, Router } from "./types.js";

export function createRouter(config: RouteConfig): Router {
  const records = normalizeRoutes(config);
  const initial = computeSnapshot(records, currentUrl());
  const state = createRouteState(initial);
  let lastLayouts = initial.layouts;

  const updateFromLocation = () => {
    const next = computeSnapshot(records, currentUrl());
    const _layoutDiff = diffLayoutChain(lastLayouts, next.layouts);
    // Layout diff is exposed for compiler/runtime integration; route snapshot changes remain fine-grained.
    lastLayouts = next.layouts;
    state.set(next);
  };

  const offIntercept = installLinkInterceptor((to) => navigateTo(to, undefined, updateFromLocation));
  const onPop = () => updateFromLocation();
  if (typeof window !== "undefined") {
    window.addEventListener("popstate", onPop);
  }

  return {
    records,
    route: state.route,
    navigate(to, options) {
      navigateTo(to, options, updateFromLocation);
    },
    isActive: makeIsActive(state.route),
    destroy() {
      offIntercept();
      if (typeof window !== "undefined") {
        window.removeEventListener("popstate", onPop);
      }
    },
  };
}

function computeSnapshot(records: Router["records"], url: URL): RouteSnapshot {
  const match = matchRoute(records, url.pathname);
  return {
    path: url.pathname || "/",
    url: url.toString(),
    params: match.params,
    query: parseQuery(url.search),
    component: match.record?.component ?? null,
    layouts: dedupeLayouts(match.record?.layouts ?? []),
    matchedPath: match.record?.path ?? null,
  };
}

function dedupeLayouts(layouts: unknown[]): any[] {
  const out: any[] = [];
  const keys: string[] = [];
  for (const layout of layouts) {
    const key = layoutKey(layout);
    if (keys.length > 0 && keys[keys.length - 1] === key) continue;
    out.push(layout);
    keys.push(key);
  }
  return out;
}

function layoutKey(layout: unknown): string {
  if (typeof layout === "function") {
    return `fn:${layout.name || "anonymous"}`;
  }
  if (layout && typeof layout === "object") {
    const name = (layout as any).name;
    if (typeof name === "string" && name.length > 0) {
      return `obj:${name}`;
    }
  }
  return String(layout);
}
