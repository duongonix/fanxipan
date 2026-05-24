import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { selectContext } from "./context.js";

export const Item: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = selectContext.use();
  const value = String(props.value ?? "");
  const label = String(props.textValue ?? value);
  const disabled = !!props.disabled;
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("role", "option");
  el.tabIndex = -1;
  if (props.class) el.className = props.class;
  if (disabled) el.setAttribute("data-disabled", "");

  const sync = () => {
    const selected = ctxx.getValue() === value;
    el.setAttribute("aria-selected", selected ? "true" : "false");
    el.setAttribute("data-state", selected ? "checked" : "unchecked");
    el.setAttribute("data-highlighted", document.activeElement === el ? "true" : "false");
  };

  el.addEventListener("click", () => {
    if (disabled) return;
    ctxx.setValue(value);
    ctxx.setLabel(label);
    props.onSelect?.(value);
    ctxx.setOpen(false);
    ctxx.triggerRef.current?.focus();
  });
  el.addEventListener("focus", sync);
  el.addEventListener("blur", sync);

  ctxx.registerItem({ value, label, disabled, el });
  sync();
  const off = ctxx.subscribe(sync);
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { off(); ctxx.unregisterItem(el); if (el.parentNode === target) target.removeChild(el); };
};
