import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { createFocusTrap } from "../../internal/focus-scope.js";
import { dialogContext } from "./context.js";

export const Content: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = dialogContext.use();
  const el = document.createElement("div");
  if (props.id) el.id = props.id;
  if (props.class) el.className = props.class;
  if (props.style) el.setAttribute("style", typeof props.style === "string" ? props.style : "");
  el.setAttribute("role", "dialog");
  el.tabIndex = -1;

  const onDocClick = (e: MouseEvent) => {
    if (!ctxx.getOpen() || !ctxx.modal) return;
    if (!el.contains(e.target as Node)) ctxx.setOpen(false);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") ctxx.setOpen(false);
  };
  const trapOff = createFocusTrap(el);
  const previousOverflow = typeof document !== "undefined" ? document.body.style.overflow : "";

  const sync = () => {
    const open = ctxx.getOpen();
    el.setAttribute("data-state", open ? "open" : "closed");
    el.hidden = !open && !props.forceMount;
    if (ctxx.modal) document.body.style.overflow = open ? "hidden" : previousOverflow;
    if (open) setTimeout(() => el.focus(), 0);
    else ctxx.triggerRef.current?.focus();
  };
  sync();

  document.addEventListener("mousedown", onDocClick);
  el.addEventListener("keydown", onKey);
  const off = ctxx.subscribe(sync);
  if (children) el.appendChild(children());
  target.appendChild(el);
  ctxx.contentRef.current = el;

  return () => {
    off();
    trapOff();
    document.removeEventListener("mousedown", onDocClick);
    el.removeEventListener("keydown", onKey);
    if (ctxx.modal) document.body.style.overflow = previousOverflow;
    if (ctxx.contentRef.current === el) ctxx.contentRef.current = null;
    if (el.parentNode === target) target.removeChild(el);
  };
};
