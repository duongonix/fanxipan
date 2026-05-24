import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { menuContext } from "./context.js";

function baseItem(role: string): FanxipanComponent {
  return (target, _ctx, props: PrimitiveProps = {}, children) => {
    const ctxx = menuContext.use();
    const value = String(props.value ?? "");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("role", role);
    if (props.class) btn.className = props.class;
    if (props.disabled) btn.setAttribute("data-disabled", "");
    btn.addEventListener("click", () => {
      if (props.disabled) return;
      ctxx.onSelect?.(value);
      if (props.onSelect) props.onSelect(value);
      if (props.closeOnSelect ?? true) ctxx.setOpen(false);
    });
    if (children) btn.appendChild(children());
    target.appendChild(btn);
    return () => { if (btn.parentNode === target) target.removeChild(btn); };
  };
}

export const Item = baseItem("menuitem");
export const CheckboxItem = baseItem("menuitemcheckbox");
export const RadioItem = baseItem("menuitemradio");
