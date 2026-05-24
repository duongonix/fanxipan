import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { selectContext } from "./context.js";

export const Content: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = selectContext.use();
  const el = document.createElement("div");
  el.setAttribute("role", "listbox");
  if (props.class) el.className = props.class;

  let typeahead = "";
  let typeaheadTimer: ReturnType<typeof setTimeout> | null = null;

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
  const onKey = (e: KeyboardEvent) => {
    const items = ctxx.getItems().filter((i) => !i.disabled);
    const idx = items.findIndex((x) => x.value === ctxx.getValue());
    if (e.key === "Escape") { e.preventDefault(); ctxx.setOpen(false); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = items[(idx + 1 + items.length) % items.length];
      if (next) { ctxx.setValue(next.value); ctxx.setLabel(next.label); next.el.focus(); }
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = items[(idx - 1 + items.length) % items.length];
      if (next) { ctxx.setValue(next.value); ctxx.setLabel(next.label); next.el.focus(); }
      return;
    }
    if (e.key.length === 1 && /\S/.test(e.key)) {
      typeahead += e.key.toLowerCase();
      if (typeaheadTimer) clearTimeout(typeaheadTimer);
      typeaheadTimer = setTimeout(() => { typeahead = ""; }, 300);
      const hit = items.find((i) => i.label.toLowerCase().startsWith(typeahead));
      if (hit) { ctxx.setValue(hit.value); ctxx.setLabel(hit.label); hit.el.focus(); }
    }
  };

  document.addEventListener("mousedown", onDoc);
  el.addEventListener("keydown", onKey);
  sync();
  const off = ctxx.subscribe(sync);
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { off(); if (typeaheadTimer) clearTimeout(typeaheadTimer); document.removeEventListener("mousedown", onDoc); el.removeEventListener("keydown", onKey); if (el.parentNode === target) target.removeChild(el); };
};
