export interface DevtoolsEvent {
  type: string;
  payload?: Record<string, unknown>;
  at: number;
}

export interface DevtoolsBridge {
  emit(type: string, payload?: Record<string, unknown>): void;
  subscribe(run: (event: DevtoolsEvent) => void): () => void;
}

export function createDevtoolsBridge(): DevtoolsBridge {
  const listeners = new Set<(event: DevtoolsEvent) => void>();
  return {
    emit(type, payload) {
      const event: DevtoolsEvent = { type, payload, at: Date.now() };
      for (const run of listeners) run(event);
    },
    subscribe(run) {
      listeners.add(run);
      return () => void listeners.delete(run);
    },
  };
}
