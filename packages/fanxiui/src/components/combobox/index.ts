import { createComponentContext } from "../../internal/create-context.js";
import type { FanxipanComponent, PrimitiveProps } from "../../types.js";

type ComboboxContext = {
  getOpen: () => boolean;
  setOpen: (next: boolean) => void;
  getValue: () => string;
  setValue: (next: string) => void;
  getInputValue: () => string;
  setInputValue: (next: string) => void;
  subscribe: (run: () => void) => () => void;
  registerOption: (item: { value: string; label: string; el: HTMLElement }) => void;
  unregisterOption: (el: HTMLElement) => void;
  getOptions: () => Array<{ value: string; label: string; el: HTMLElement }>;
};

const comboboxContext = createComponentContext<ComboboxContext>("Combobox.Input");

const Root: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const listeners = new Set<() => void>();
  let open = !!props.defaultOpen;
  let value = String(props.defaultValue ?? "");
  let inputValue = String(props.defaultInputValue ?? "");
  const options: Array<{ value: string; label: string; el: HTMLElement }> = [];
  const ctx: ComboboxContext = {
    getOpen: () => (props.open ?? open) as boolean,
    setOpen: (next: boolean) => { open = next; props.onOpenChange?.(next); for (const run of listeners) run(); },
    getValue: () => (props.value ?? value) as string,
    setValue: (next: string) => { value = next; props.onValueChange?.(next); for (const run of listeners) run(); },
    getInputValue: () => inputValue,
    setInputValue: (next: string) => { inputValue = next; props.onInputValueChange?.(next); for (const run of listeners) run(); },
    subscribe: (run: () => void) => { listeners.add(run); return () => listeners.delete(run); },
    registerOption: (item) => { options.push(item); },
    unregisterOption: (el) => { const i = options.findIndex((x) => x.el === el); if (i >= 0) options.splice(i, 1); },
    getOptions: () => options
  };
  comboboxContext.set(ctx);
  if (children) target.appendChild(children());
  return () => listeners.clear();
};

const Input: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}) => {
  const ctxx = comboboxContext.use();
  const input = document.createElement("input");
  if (props.class) input.className = props.class;
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-expanded", ctxx.getOpen() ? "true" : "false");
  input.value = ctxx.getInputValue();

  const sync = () => {
    input.value = ctxx.getInputValue();
    input.setAttribute("aria-expanded", ctxx.getOpen() ? "true" : "false");
  };

  input.addEventListener("input", () => {
    ctxx.setInputValue(input.value);
    ctxx.setOpen(true);
  });
  input.addEventListener("keydown", (e) => {
    const filtered = ctxx.getOptions().filter((o) => o.label.toLowerCase().includes(ctxx.getInputValue().toLowerCase()));
    if (e.key === "ArrowDown") {
      e.preventDefault();
      filtered[0]?.el.focus();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      ctxx.setOpen(false);
    }
  });

  const off = ctxx.subscribe(sync);
  target.appendChild(input);
  return () => { off(); if (input.parentNode === target) target.removeChild(input); };
};

const Content: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = comboboxContext.use();
  const el = document.createElement("div");
  if (props.class) el.className = props.class;
  const sync = () => {
    const open = ctxx.getOpen();
    el.hidden = !open && !props.forceMount;
    el.setAttribute("data-state", open ? "open" : "closed");
  };
  sync();
  const off = ctxx.subscribe(sync);
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { off(); if (el.parentNode === target) target.removeChild(el); };
};

const Item: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = comboboxContext.use();
  const value = String(props.value ?? "");
  const label = String(props.textValue ?? value);
  const el = document.createElement("button");
  el.type = "button";
  if (props.class) el.className = props.class;
  el.addEventListener("click", () => {
    ctxx.setValue(value);
    ctxx.setInputValue(label);
    ctxx.setOpen(false);
  });
  ctxx.registerOption({ value, label, el });
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { ctxx.unregisterOption(el); if (el.parentNode === target) target.removeChild(el); };
};

export const Combobox = { Root, Input, Content, Item };
