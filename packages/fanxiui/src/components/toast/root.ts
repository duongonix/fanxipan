import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { toastContext } from "./context.js";

export const Root: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = toastContext.use();
  const id = String(props.id ?? ctxx.push({ title: props.title, description: props.description, duration: props.duration }));
  const el = document.createElement("div");
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  if (props.class) el.className = props.class;

  let timeout: ReturnType<typeof setTimeout> | null = null;
  const armTimer = () => {
    const toast = ctxx.getToasts().find((x) => x.id === id);
    if (!toast || !toast.open) return;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      ctxx.close(id);
      setTimeout(() => ctxx.remove(id), 120);
    }, toast.duration);
  };

  const sync = () => {
    const toast = ctxx.getToasts().find((x) => x.id === id);
    const open = !!toast?.open;
    el.hidden = !open && !props.forceMount;
    el.setAttribute("data-state", open ? "open" : "closed");
  };

  el.addEventListener("mouseenter", () => { if (timeout) clearTimeout(timeout); ctxx.pause(id, true); });
  el.addEventListener("mouseleave", () => { ctxx.pause(id, false); armTimer(); });
  el.addEventListener("focusin", () => { if (timeout) clearTimeout(timeout); ctxx.pause(id, true); });
  el.addEventListener("focusout", () => { ctxx.pause(id, false); armTimer(); });

  const off = ctxx.subscribe(sync);
  sync();
  armTimer();
  if (children) el.appendChild(children());
  target.appendChild(el);

  return () => {
    off();
    if (timeout) clearTimeout(timeout);
    ctxx.remove(id);
    if (el.parentNode === target) target.removeChild(el);
  };
};
