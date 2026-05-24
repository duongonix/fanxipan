import type { FanxipanComponent, PrimitiveProps } from "../../types.js";
import { Menu } from "../menu/index.js";

const Root = Menu.Root;
const Portal = Menu.Portal;
const Content = Menu.Content;
const Item = Menu.Item;
const CheckboxItem = Menu.CheckboxItem;
const RadioGroup = Menu.RadioGroup;
const RadioItem = Menu.RadioItem;
const Separator = Menu.Separator;
const Label = Menu.Label;
const Sub = Menu.Sub;
const SubTrigger = Menu.SubTrigger;
const SubContent = Menu.SubContent;

const Trigger: FanxipanComponent = (target, _ctx, props: PrimitiveProps = {}, children) => {
  const el = document.createElement("div");
  if (props.class) el.className = props.class;
  el.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    props.onContextOpen?.(e);
  });
  if (children) el.appendChild(children());
  target.appendChild(el);
  return () => { if (el.parentNode === target) target.removeChild(el); };
};

export const ContextMenu = {
  Root,
  Trigger,
  Portal,
  Content,
  Item,
  CheckboxItem,
  RadioGroup,
  RadioItem,
  Separator,
  Label,
  Sub,
  SubTrigger,
  SubContent
};
