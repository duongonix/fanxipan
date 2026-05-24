import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { createControllableState } from "../../internal/controllable-state.js";
import { checkboxContext, type CheckedState } from "./context.js";

export const Root: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const listeners = new Set<() => void>();
  const state = createControllableState<CheckedState>({
    prop: props.checked,
    defaultProp: props.defaultChecked ?? false,
    onChange: props.onCheckedChange
  });

  const ctx = {
    getChecked: () => state.get(),
    setChecked: (next: CheckedState) => { state.set(next); for (const run of listeners) run(); },
    subscribe: (run: () => void) => { listeners.add(run); return () => listeners.delete(run); },
    disabled: !!props.disabled
  };
  checkboxContext.set(ctx);

  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("role", "checkbox");
  if (props.class) button.className = props.class;
  if (props.disabled) button.setAttribute("data-disabled", "");

  const sync = () => {
    const checked = ctx.getChecked();
    const aria = checked === "indeterminate" ? "mixed" : checked ? "true" : "false";
    button.setAttribute("aria-checked", aria);
    button.setAttribute("data-state", checked === "indeterminate" ? "indeterminate" : checked ? "checked" : "unchecked");
  };
  sync();
  const toggle = () => {
    if (ctx.disabled) return;
    const current = ctx.getChecked();
    ctx.setChecked(current === true ? false : true);
  };
  button.addEventListener("click", toggle);
  button.addEventListener("keydown", (e) => { if (e.key === " ") { e.preventDefault(); toggle(); } });

  const off = ctx.subscribe(sync);
  if (children) button.appendChild(children());
  target.appendChild(button);
  return () => { off(); listeners.clear(); if (button.parentNode === target) target.removeChild(button); };
};
