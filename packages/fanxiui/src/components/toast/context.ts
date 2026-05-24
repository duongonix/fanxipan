import { createComponentContext } from "../../internal/create-context.js";

export type ToastItem = {
  id: string;
  title?: string;
  description?: string;
  open: boolean;
  duration: number;
  createdAt: number;
};

export type ToastContext = {
  subscribe: (run: () => void) => () => void;
  getToasts: () => ToastItem[];
  push: (toast: Partial<ToastItem>) => string;
  close: (id: string) => void;
  remove: (id: string) => void;
  pause: (id: string, paused: boolean) => void;
};

export const toastContext = createComponentContext<ToastContext>("Toast.Root");
