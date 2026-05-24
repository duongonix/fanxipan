import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { createControllableState } from "../../internal/controllable-state.js";
import { switchContext } from "./context.js";

export const Root: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const listeners = new Set<() => void>();
  const state = createControllableState<boolean>({
    prop: props.checked,
    defaultProp: props.defaultChecked ?? false,
    onChange: props.onCheckedChange
  });
  const ctx = {
    getChecked: () => state.get(),
    setChecked: (next: boolean) => { state.set(next); for (const run of listeners) run(); },
    subscribe: (run: () => void) => { listeners.add(run); return () => listeners.delete(run); },
    disabled: !!props.disabled
  };
  switchContext.set(ctx);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("role", "switch");
  if (props.class) btn.className = props.class;
  if (props.disabled) btn.setAttribute("data-disabled", "");

  const sync = () => {
    const checked = ctx.getChecked();
    btn.setAttribute("aria-checked", checked ? "true" : "false");
    btn.setAttribute("data-state", checked ? "checked" : "unchecked");
  };
  const toggle = () => { if (!ctx.disabled) ctx.setChecked(!ctx.getChecked()); };
  btn.addEventListener("click", toggle);
  btn.addEventListener("keydown", (e) => { if (e.key === " ") { e.preventDefault(); toggle(); } });
  sync();
  const off = ctx.subscribe(sync);
  if (children) btn.appendChild(children());
  target.appendChild(btn);
  return () => { off(); listeners.clear(); if (btn.parentNode === target) target.removeChild(btn); };
};
