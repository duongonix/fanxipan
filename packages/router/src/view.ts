// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - runtime is built as a sibling workspace package.
import { createRenderContext } from "../../runtime/dist/index.js";
import type { fanxipanComponent, RouteSnapshot } from "./types.js";

type MountedInstance = {
  component: fanxipanComponent;
  host: HTMLElement;
  outlet: Element;
  cleanup?: () => void;
};

export function createRouterView(routeRef: { current: () => RouteSnapshot }) {
  let root: Element | null = null;
  let instances: MountedInstance[] = [];
  let outletId = 0;

  const render = () => {
    if (!root) return;
    const route = routeRef.current();
    const chain = [...route.layouts, route.component].filter(Boolean) as fanxipanComponent[];
    const common = findCommonPrefix(instances, chain);
    const prevLen = instances.length;
    unmountTail(common);
    let parent = common === 0 ? root : instances[common - 1].outlet;
    // Defensive cleanup: if any child subtree changed, clear current outlet before mounting new tail.
    // This prevents orphaned nodes when a component cleanup misses nested insertions.
    if (common === 0) {
      root.replaceChildren();
      parent = root;
    } else if (common < chain.length || common < prevLen) {
      parent.replaceChildren();
    }
    for (let i = common; i < chain.length; i += 1) {
      const withOutlet = i < chain.length - 1;
      const next = mountInstance(chain[i], parent, route, withOutlet, ++outletId);
      instances.push(next);
      parent = next.outlet;
    }
    if (chain.length === 0) {
      root.replaceChildren();
    }
  };

  return {
    mount(target: Element) {
      root = target;
      render();
      return () => {
        unmountTail(0);
        root = null;
      };
    },
    render,
  };

  function unmountTail(from: number) {
    for (let i = instances.length - 1; i >= from; i -= 1) {
      const inst = instances[i];
      inst.cleanup?.();
      if (inst.host.parentNode) inst.host.parentNode.removeChild(inst.host);
      instances.pop();
    }
  }
}

function mountInstance(
  component: fanxipanComponent,
  parent: Element,
  route: RouteSnapshot,
  withOutlet: boolean,
  id: number
): MountedInstance {
  const host = document.createElement("div");
  host.setAttribute("data-fanxipan-router-node", "");
  parent.appendChild(host);

  let outlet: Element = host;
  const outletAttr = `r${id}`;
  const children = withOutlet
    ? () => {
        const frag = document.createDocumentFragment();
        const marker = document.createElement("div");
        marker.setAttribute("data-fanxipan-router-outlet", outletAttr);
        frag.appendChild(marker);
        return frag;
      }
    : undefined;

  const ctx = createRenderContext();
  const props = { route, params: route.params, query: route.query };
  let cleanup: (() => void) | undefined;

  const resolved = resolveComponent(component);

  if (typeof resolved === "function") {
    const out = resolved(host, ctx, props, children, "render");
    if (typeof out === "function") {
      cleanup = out;
    } else if (out && typeof out.create === "function") {
      cleanup = invokeCreate(out, host, ctx, props, children);
    }
  } else if (resolved && typeof resolved.create === "function") {
    cleanup = invokeCreate(resolved, host, ctx, props, children);
  }

  if (withOutlet) {
    const found = host.querySelector(`[data-fanxipan-router-outlet="${outletAttr}"]`);
    if (found) outlet = found as Element;
  }

  return { component, host, outlet, cleanup };
}

function resolveComponent(input: any): any {
  if (!input) return input;
  if (typeof input === "function") return input;
  if (input && typeof input.default === "function") return input.default;
  return input;
}

function invokeCreate(
  obj: { create: (...args: any[]) => any },
  host: Element,
  ctx: unknown,
  props: Record<string, unknown>,
  children: (() => DocumentFragment) | undefined
): (() => void) | undefined {
  const out = obj.create(host, ctx, props, children, "render");
  if (typeof out === "function") return out;
  const fallback = obj.create(host, ctx, "render");
  if (typeof fallback === "function") return fallback;
  return undefined;
}

function findCommonPrefix(instances: MountedInstance[], nextChain: fanxipanComponent[]): number {
  let i = 0;
  while (i < instances.length && i < nextChain.length && instances[i].component === nextChain[i]) i += 1;
  return i;
}


