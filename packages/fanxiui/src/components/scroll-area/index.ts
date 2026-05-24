import { createComponentContext } from "../../internal/create-context.js";

type ScrollAreaContext = {
  viewportRef: { current: HTMLElement | null };
  subscribe: (run: () => void) => () => void;
  notify: () => void;
};

const scrollAreaContext = createComponentContext<ScrollAreaContext>("ScrollArea.Viewport");

import type { FanxipanComponent, PrimitiveProps } from "../../types.js";

const Root: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const listeners = new Set<() => void>();
  const ctx = {
    viewportRef: { current: null as HTMLElement | null },
    subscribe: (run: () => void) => { listeners.add(run); return () => listeners.delete(run); },
    notify: () => { for (const run of listeners) run(); }
  };
  scrollAreaContext.set(ctx);
  const el = document.createElement("div");
  if (props.class) el.className = props.class;
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => listeners.clear();
};

const Viewport: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = scrollAreaContext.use();
  const el = document.createElement("div");
  el.style.overflow = "auto";
  if (props.class) el.className = props.class;
  el.addEventListener("scroll", () => ctxx.notify());
  if (children) el.appendChild(children());
  target.appendChild(el);
  ctxx.viewportRef.current = el;
  return () => { if (ctxx.viewportRef.current === el) ctxx.viewportRef.current = null; if (el.parentNode === target) target.removeChild(el); };
};

const Scrollbar: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}) => {
  const ctxx = scrollAreaContext.use();
  const el = document.createElement("div");
  const thumb = document.createElement("div");
  if (props.class) el.className = props.class;
  el.appendChild(thumb);
  const sync = () => {
    const vp = ctxx.viewportRef.current;
    if (!vp) return;
    const ratio = vp.clientHeight / Math.max(vp.scrollHeight, 1);
    const topRatio = vp.scrollTop / Math.max(vp.scrollHeight - vp.clientHeight, 1);
    thumb.setAttribute("style", `height:${Math.max(10, ratio * 100)}%;transform:translateY(${topRatio * 100}%);`);
  };
  sync();
  const off = ctxx.subscribe(sync);
  target.appendChild(el);
  return () => { off(); if (el.parentNode === target) target.removeChild(el); };
};

const Thumb: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const el = document.createElement("div");
  if (props.class) el.className = props.class;
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { if (el.parentNode === target) target.removeChild(el); };
};

const Corner: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}) => {
  const el = document.createElement("div");
  if (props.class) el.className = props.class;
  target.appendChild(el);
  return () => { if (el.parentNode === target) target.removeChild(el); };
};

export const ScrollArea = { Root, Viewport, Scrollbar, Thumb, Corner };
