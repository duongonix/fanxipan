import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { createPortalHost } from "../../internal/portal.js";
import { selectContext } from "./context.js";

export const Portal: FanxipanComponent = (_target, _ctx, props: PrimitiveProps = {}, children) => {
  const host = createPortalHost(props.to);
  const ctxx = selectContext.use();
  if (!host || !children) return;
  const wrap = document.createElement("div");
  host.appendChild(wrap);
  const sync = () => {
    wrap.replaceChildren();
    if (ctxx.getOpen() || props.forceMount) wrap.appendChild(children());
  };
  sync();
  const off = ctxx.subscribe(sync);
  return () => { off(); if (wrap.parentNode === host) host.removeChild(wrap); };
};
