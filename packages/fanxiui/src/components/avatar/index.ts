import { createComponentContext } from "../../internal/create-context.js";
import type { FanxipanComponent, PrimitiveProps } from "../../types.js";

type AvatarContext = {
  getLoaded: () => boolean;
  setLoaded: (next: boolean) => void;
  subscribe: (run: () => void) => () => void;
};

const avatarContext = createComponentContext<AvatarContext>("Avatar.Image");

const Root: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const listeners = new Set<() => void>();
  let loaded = false;
  const ctx = {
    getLoaded: () => loaded,
    setLoaded: (next: boolean) => { loaded = next; for (const run of listeners) run(); },
    subscribe: (run: () => void) => { listeners.add(run); return () => listeners.delete(run); }
  };
  avatarContext.set(ctx);
  const el = document.createElement("span");
  if (props.class) el.className = props.class;
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => listeners.clear();
};

const Image: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}) => {
  const ctxx = avatarContext.use();
  const img = document.createElement("img");
  if (props.class) img.className = props.class;
  if (props.src) img.src = String(props.src);
  if (props.alt) img.alt = String(props.alt);
  img.addEventListener("load", () => ctxx.setLoaded(true));
  img.addEventListener("error", () => ctxx.setLoaded(false));
  const sync = () => { img.hidden = !ctxx.getLoaded(); img.setAttribute("data-state", ctxx.getLoaded() ? "loaded" : "idle"); };
  sync();
  const off = ctxx.subscribe(sync);
  target.appendChild(img);
  return () => { off(); if (img.parentNode === target) target.removeChild(img); };
};

const Fallback: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = avatarContext.use();
  const el = document.createElement("span");
  if (props.class) el.className = props.class;
  const sync = () => { el.hidden = ctxx.getLoaded(); el.setAttribute("data-state", ctxx.getLoaded() ? "hidden" : "visible"); };
  sync();
  const off = ctxx.subscribe(sync);
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { off(); if (el.parentNode === target) target.removeChild(el); };
};

export const Avatar = { Root, Image, Fallback };
