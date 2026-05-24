import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { createPortalHost } from "../../internal/portal.js";
import { createPresence } from "../../internal/presence.js";
import { dialogContext } from "./context.js";

export const Portal: FanxipanComponent = (_target, _ctx, props: PrimitiveProps = {}, children) => {
  const ctxx = dialogContext.use();
  const host = createPortalHost(props.to);
  if (!host || !children) return;

  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-fanxiui-dialog-portal", "");
  host.appendChild(wrapper);
  let mounted = false;
  const mount = () => {
    const shouldMount = createPresence(ctxx.getOpen(), !!props.forceMount);
    if (shouldMount && !mounted) {
      wrapper.appendChild(children());
      mounted = true;
    }
    if (!shouldMount && mounted) {
      wrapper.replaceChildren();
      mounted = false;
    }
  };
  mount();
  const off = ctxx.subscribe(mount);
  return () => { off(); if (wrapper.parentNode === host) host.removeChild(wrapper); };
};
