import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { createPortalHost } from "../../internal/portal.js";
import { popoverContext } from "./context.js";

export const Portal: FanxipanComponent = (_target, _ctx, props: PrimitiveProps = {}, children) => {
  const host = createPortalHost(props.to);
  const ctxx = popoverContext.use();
  if (!host || !children) return;
  const wrap = document.createElement("div");
  host.appendChild(wrap);
  const sync = () => {
    const open = ctxx.getOpen();
    wrap.replaceChildren();
    if (open || props.forceMount) wrap.appendChild(children());
  };
  sync();
  const off = ctxx.subscribe(sync);
  return () => { off(); if (wrap.parentNode === host) host.removeChild(wrap); };
};
