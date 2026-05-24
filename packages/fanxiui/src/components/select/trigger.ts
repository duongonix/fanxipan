import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { selectContext } from "./context.js";

export const Trigger: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = selectContext.use();
  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-haspopup", "listbox");
  if (props.class) btn.className = props.class;
  if (props.disabled) btn.setAttribute("data-disabled", "");

  const sync = () => {
    const open = ctxx.getOpen();
    btn.setAttribute("data-state", open ? "open" : "closed");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  };
  const move = (dir: 1 | -1) => {
    const items = ctxx.getItems().filter((i) => !i.disabled);
    if (items.length === 0) return;
    const current = items.findIndex((x) => x.value === ctxx.getValue());
    const next = items[(current + dir + items.length) % items.length];
    ctxx.setValue(next.value);
    ctxx.setLabel(next.label);
  };

  btn.addEventListener("click", () => { if (!props.disabled) ctxx.setOpen(!ctxx.getOpen()); });
  btn.addEventListener("keydown", (e) => {
    if (props.disabled) return;
    if (e.key === "ArrowDown") { e.preventDefault(); if (!ctxx.getOpen()) ctxx.setOpen(true); move(1); }
    if (e.key === "ArrowUp") { e.preventDefault(); if (!ctxx.getOpen()) ctxx.setOpen(true); move(-1); }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ctxx.setOpen(!ctxx.getOpen()); }
    if (e.key === "Escape") { e.preventDefault(); ctxx.setOpen(false); }
  });

  sync();
  const off = ctxx.subscribe(sync);
  if (children) btn.appendChild(children());
  target.appendChild(btn);
  ctxx.triggerRef.current = btn;
  return () => { off(); if (ctxx.triggerRef.current === btn) ctxx.triggerRef.current = null; if (btn.parentNode === target) target.removeChild(btn); };
};
