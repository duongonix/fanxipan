export interface DevtoolsComponentNode {
  id: string;
  name: string;
  parentId?: string;
  state?: Record<string, unknown>;
}

export interface DevtoolsEvent {
  type: "component:add" | "component:remove" | "state:update" | "effect:run" | "dom:update";
  componentId?: string;
  payload?: unknown;
  timestamp: number;
}

export interface FanxipanDevtools {
  components: Map<string, DevtoolsComponentNode>;
  events: DevtoolsEvent[];
  registerComponent: (node: DevtoolsComponentNode) => () => void;
  updateState: (componentId: string, state: Record<string, unknown>) => void;
  traceEffect: (componentId: string, payload?: unknown) => void;
  traceDomUpdate: (componentId: string, payload?: unknown) => void;
  snapshot: () => { components: DevtoolsComponentNode[]; events: DevtoolsEvent[] };
}

export function initDevtools(): FanxipanDevtools {
  const global = globalThis as any;
  if (global.__FANXIPAN_DEVTOOLS__) return global.__FANXIPAN_DEVTOOLS__;

  const components = new Map<string, DevtoolsComponentNode>();
  const events: DevtoolsEvent[] = [];
  const push = (event: Omit<DevtoolsEvent, "timestamp">) => {
    events.push({ ...event, timestamp: performance.now?.() ?? Date.now() });
    if (events.length > 1000) events.shift();
  };

  const api: FanxipanDevtools = {
    components,
    events,
    registerComponent(node) {
      components.set(node.id, node);
      push({ type: "component:add", componentId: node.id, payload: node });
      return () => {
        components.delete(node.id);
        push({ type: "component:remove", componentId: node.id });
      };
    },
    updateState(componentId, state) {
      const node = components.get(componentId);
      if (node) node.state = { ...(node.state ?? {}), ...state };
      push({ type: "state:update", componentId, payload: state });
    },
    traceEffect(componentId, payload) {
      push({ type: "effect:run", componentId, payload });
    },
    traceDomUpdate(componentId, payload) {
      push({ type: "dom:update", componentId, payload });
    },
    snapshot() {
      return {
        components: Array.from(components.values()),
        events: [...events],
      };
    },
  };

  global.__FANXIPAN_DEVTOOLS__ = api;
  return api;
}
