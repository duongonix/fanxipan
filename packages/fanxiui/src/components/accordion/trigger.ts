import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { accordionItemContext } from "./context.js";

export const Trigger: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const item = accordionItemContext.use();
  const btn = document.createElement("button");
  btn.type = "button";
  if (props.class) btn.className = props.class;

  const sync = () => {
    const open = item.getOpen();
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("data-state", open ? "open" : "closed");
    btn.setAttribute("data-disabled", item.disabled ? "" : "false");
  };

  const move = (dir: 1 | -1) => {
    const all = Array.from(document.querySelectorAll<HTMLButtonElement>('button[data-accordion-trigger="true"]'));
    const idx = all.indexOf(btn);
    if (idx < 0 || all.length === 0) return;
    all[(idx + dir + all.length) % all.length].focus();
  };

  btn.setAttribute("data-accordion-trigger", "true");
  btn.addEventListener("click", () => item.toggle());
  btn.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); move(1); }
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
    if (e.key === "Home") { e.preventDefault(); (document.querySelector('button[data-accordion-trigger="true"]') as HTMLElement | null)?.focus(); }
    if (e.key === "End") {
      e.preventDefault();
      const all = document.querySelectorAll<HTMLElement>('button[data-accordion-trigger="true"]');
      all[all.length - 1]?.focus();
    }
  });
  sync();
  if (children) btn.appendChild(children());
  target.appendChild(btn);
  item.registerTrigger(btn);
  return () => { item.unregisterTrigger(btn); if (btn.parentNode === target) target.removeChild(btn); };
};
