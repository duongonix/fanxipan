import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { createControllableState } from "../../internal/controllable-state.js";

export const Root: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const state = createControllableState<boolean>({
    prop: props.pressed,
    defaultProp: props.defaultPressed ?? false,
    onChange: props.onPressedChange
  });
  const btn = document.createElement("button");
  btn.type = "button";
  if (props.class) btn.className = props.class;
  const sync = () => {
    const pressed = state.get();
    btn.setAttribute("aria-pressed", pressed ? "true" : "false");
    btn.setAttribute("data-state", pressed ? "on" : "off");
  };
  btn.addEventListener("click", () => state.set(!state.get()));
  sync();
  if (children) btn.appendChild(children());
  target.appendChild(btn);
  return () => { if (btn.parentNode === target) target.removeChild(btn); };
};
