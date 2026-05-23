import type { fanxipanComponent } from "./types.js";

export type LayoutDiff = {
  reuseUntil: number;
  mount: fanxipanComponent[];
  unmountCount: number;
};

export function diffLayoutChain(prev: fanxipanComponent[], next: fanxipanComponent[]): LayoutDiff {
  let reuseUntil = 0;
  while (reuseUntil < prev.length && reuseUntil < next.length && prev[reuseUntil] === next[reuseUntil]) {
    reuseUntil += 1;
  }
  return {
    reuseUntil,
    mount: next.slice(reuseUntil),
    unmountCount: Math.max(0, prev.length - reuseUntil),
  };
}


