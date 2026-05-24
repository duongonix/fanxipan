import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { popoverContext } from "./context.js";

export const Content: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = popoverContext.use();
  const el = document.createElement("div");
  if (props.class) el.className = props.class;
  el.setAttribute("role", "dialog");
  const sync = () => {
    const open = ctxx.getOpen();
    el.hidden = !open && !props.forceMount;
    el.setAttribute("data-state", open ? "open" : "closed");
  };
  const onDoc = (e: MouseEvent) => {
    if (!ctxx.getOpen()) return;
    const t = e.target as Node;
    if (!el.contains(t) && !ctxx.triggerRef.current?.contains(t)) ctxx.setOpen(false);
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") ctxx.setOpen(false); };
  document.addEventListener("mousedown", onDoc);
  el.addEventListener("keydown", onKey);
  sync();
  const off = ctxx.subscribe(sync);
  if (children) el.appendChild(children());
  target.appendChild(el);
  ctxx.contentRef.current = el;
  return () => { off(); document.removeEventListener("mousedown", onDoc); el.removeEventListener("keydown", onKey); if (el.parentNode === target) target.removeChild(el); };
};
