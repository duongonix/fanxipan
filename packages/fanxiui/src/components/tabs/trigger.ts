import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { tabsContext } from "./context.js";

export const Trigger: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = tabsContext.use();
  const value = String(props.value ?? "");
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("role", "tab");
  el.setAttribute("data-orientation", ctxx.orientation);

  const sync = () => {
    const selected = ctxx.getValue() === value;
    el.setAttribute("data-state", selected ? "active" : "inactive");
    el.setAttribute("aria-selected", selected ? "true" : "false");
    el.tabIndex = selected ? 0 : -1;
  };

  const move = (dir: 1 | -1) => {
    const list = el.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    if (!list || list.length === 0) return;
    const arr = Array.from(list);
    const current = arr.indexOf(el);
    if (current < 0) return;
    const next = arr[(current + dir + arr.length) % arr.length];
    next.focus();
    if (ctxx.activationMode === "automatic") next.click();
  };

  el.addEventListener("click", () => ctxx.setValue(value));
  el.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); move(1); }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    if (e.key === "Home") { e.preventDefault(); (el.parentElement?.querySelector('[role="tab"]') as HTMLElement | null)?.focus(); }
    if (e.key === "End") {
      e.preventDefault();
      const tabs = el.parentElement?.querySelectorAll<HTMLElement>('[role="tab"]');
      tabs?.[tabs.length - 1]?.focus();
    }
    if (ctxx.activationMode === "manual" && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      ctxx.setValue(value);
    }
  });

  sync();
  const off = ctxx.subscribe(sync);
  ctxx.registerTrigger(el, value);
  if (children) el.appendChild(children());
  target.appendChild(el);

  return () => { off(); ctxx.unregisterTrigger(el); if (el.parentNode === target) target.removeChild(el); };
};
