import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { createPortalHost } from "../../internal/portal.js";

export const Portal: FanxipanComponent = (_target, _ctx, props: PrimitiveProps = {}, children) => {
  const host = createPortalHost(props.to);
  if (!host || !children) return;
  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-fanxiui-portal", "");
  wrapper.appendChild(children());
  host.appendChild(wrapper);
  return () => {
    if (wrapper.parentNode === host) host.removeChild(wrapper);
  };
};

