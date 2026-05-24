import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { menuContext } from "./context.js";

export const Content: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = menuContext.use();
  const el = document.createElement("div");
  el.setAttribute("role", "menu");
  if (props.class) el.className = props.class;

  const sync = () => {
    const open = ctxx.getOpen();
    el.hidden = !open && !props.forceMount;
    el.setAttribute("data-state", open ? "open" : "closed");
  };
  const onKey = (e: KeyboardEvent) => {
    const items = Array.from(el.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]'));
    if (e.key === "Escape") { e.preventDefault(); ctxx.setOpen(false); return; }
    if (items.length === 0) return;
    const idx = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[(idx + 1 + items.length) % items.length].focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); items[(idx - 1 + items.length) % items.length].focus(); }
    if (e.key === "Home") { e.preventDefault(); items[0].focus(); }
    if (e.key === "End") { e.preventDefault(); items[items.length - 1].focus(); }
  };
  const onDoc = (e: MouseEvent) => {
    if (!ctxx.getOpen()) return;
    if (!el.contains(e.target as Node)) ctxx.setOpen(false);
  };

  document.addEventListener("mousedown", onDoc);
  el.addEventListener("keydown", onKey);
  sync();
  const off = ctxx.subscribe(sync);
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { off(); document.removeEventListener("mousedown", onDoc); el.removeEventListener("keydown", onKey); if (el.parentNode === target) target.removeChild(el); };
};
