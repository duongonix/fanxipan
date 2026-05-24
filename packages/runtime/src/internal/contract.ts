import type { RenderContext } from "../client.js";

export type RenderMode = "render" | "hydrate";

export type CompiledComponentCreate = (
  target: Element | null,
  ctx: RenderContext,
  mode?: RenderMode
) => (() => void) | void;

export interface CompiledComponentObject {
  create: CompiledComponentCreate;
}

export interface CompiledComponentFunction {
  (
    target: Element | null,
    ctx: RenderContext,
    props?: Record<string, unknown>,
    children?: (() => DocumentFragment) | undefined,
    mode?: RenderMode
  ): (() => void) | CompiledComponentObject | void;
}

export type CompiledComponentLike = CompiledComponentFunction | CompiledComponentObject;
