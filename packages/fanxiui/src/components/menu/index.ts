import { Root } from "./root.js";
import { Trigger } from "./trigger.js";
import { Portal } from "./portal.js";
import { Content } from "./content.js";
import { Item, CheckboxItem, RadioItem } from "./item.js";
import { Label, Separator } from "./primitives.js";

const RadioGroup = { Root };
const Sub = { Root };
const SubTrigger = Trigger;
const SubContent = Content;

export const Menu = {
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
