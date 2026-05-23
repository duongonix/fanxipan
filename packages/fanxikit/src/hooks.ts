import { existsSync } from "node:fs";
import path from "node:path";
import { importAppModule } from "./module-loader.js";
import type { RequestEvent, ServerHooks } from "./types.js";

export async function loadServerHooks(root: string): Promise<ServerHooks> {
  const file = path.resolve(root, "src/hooks.server.ts");
  if (!existsSync(file)) return {};
  const mod = await importAppModule(file, root);
  return {
    handle: typeof mod.handle === "function" ? (mod.handle as ServerHooks["handle"]) : undefined,
    handleFetch: typeof mod.handleFetch === "function" ? (mod.handleFetch as ServerHooks["handleFetch"]) : undefined,
    handleError: typeof mod.handleError === "function" ? (mod.handleError as ServerHooks["handleError"]) : undefined,
  };
}

export async function runHandleHook(
  hooks: ServerHooks,
  event: RequestEvent,
  resolve: (event: RequestEvent) => Promise<Response>
): Promise<Response> {
  if (!hooks.handle) return resolve(event);
  return hooks.handle({ event, resolve });
}
