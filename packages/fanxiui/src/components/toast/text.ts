import type { FanxipanComponent, PrimitiveProps } from "../../types.js";

export const Title: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const el = document.createElement("div");
  if (props.class) el.className = props.class;
  if (props.title) el.textContent = String(props.title);
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { if (el.parentNode === target) target.removeChild(el); };
};

export const Description: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const el = document.createElement("div");
  if (props.class) el.className = props.class;
  if (props.description) el.textContent = String(props.description);
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { if (el.parentNode === target) target.removeChild(el); };
};
