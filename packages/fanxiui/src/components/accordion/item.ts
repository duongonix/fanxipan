import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { accordionContext, accordionItemContext } from "./context.js";

export const Item: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const group = accordionContext.use();
  const value = String(props.value ?? "");
  const triggers: HTMLButtonElement[] = [];

  const isOpen = () => {
    const current = group.getValue();
    if (group.type === "single") return current === value;
    return Array.isArray(current) && current.includes(value);
  };

  const toggle = () => {
    if (props.disabled) return;
    if (group.type === "single") {
      if (isOpen()) {
        if (group.collapsible) group.setValue("");
      } else {
        group.setValue(value);
      }
      return;
    }
    const arr = Array.isArray(group.getValue()) ? [...(group.getValue() as string[])] : [];
    const idx = arr.indexOf(value);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(value);
    group.setValue(arr);
  };

  accordionItemContext.set({
    value,
    disabled: !!props.disabled,
    getOpen: isOpen,
    subscribe: group.subscribe,
    toggle,
    registerTrigger: (el) => { triggers.push(el); },
    unregisterTrigger: (el) => {
      const i = triggers.indexOf(el);
      if (i >= 0) triggers.splice(i, 1);
    },
    getTriggers: () => triggers
  });

  const el = document.createElement("div");
  const sync = () => {
    const open = isOpen();
    el.setAttribute("data-state", open ? "open" : "closed");
    el.setAttribute("data-orientation", group.orientation);
    if (props.disabled) el.setAttribute("data-disabled", "");
  };
  sync();
  const off = group.subscribe(sync);
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { off(); if (el.parentNode === target) target.removeChild(el); };
};
