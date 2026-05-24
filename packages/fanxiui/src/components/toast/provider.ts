import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { toastContext } from "./context.js";

let toastId = 0;

export const Provider: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const listeners = new Set<() => void>();
  const toasts: Array<{ id: string; title?: string; description?: string; open: boolean; duration: number; createdAt: number; paused?: boolean; }> = [];

  const emit = () => { for (const run of listeners) run(); };

  const ctx = {
    subscribe: (run: () => void) => { listeners.add(run); return () => listeners.delete(run); },
    getToasts: () => toasts,
    push: (toast: Partial<{ id: string; title?: string; description?: string; open: boolean; duration: number; createdAt: number; }>) => {
      toastId += 1;
      const id = toast.id ?? `toast-${toastId}`;
      toasts.push({ id, title: toast.title, description: toast.description, open: true, duration: toast.duration ?? Number(props.duration ?? 4000), createdAt: Date.now() });
      emit();
      return id;
    },
    close: (id: string) => {
      const t = toasts.find((x) => x.id === id);
      if (!t) return;
      t.open = false;
      emit();
    },
    remove: (id: string) => {
      const i = toasts.findIndex((x) => x.id === id);
      if (i >= 0) {
        toasts.splice(i, 1);
        emit();
      }
    },
    pause: (id: string, paused: boolean) => {
      const t = toasts.find((x) => x.id === id);
      if (!t) return;
      t.paused = paused;
    }
  };

  toastContext.set(ctx);
  if (children) target.appendChild(children());
  return () => listeners.clear();
};
