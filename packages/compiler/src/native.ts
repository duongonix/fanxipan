import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CompileResult, CompilerNativeBridge } from "./types.js";

let cachedBridge: CompilerNativeBridge | null | undefined;

function resolveNativeBridge(): CompilerNativeBridge | null {
  if (cachedBridge !== undefined) return cachedBridge;
  const req = createRequire(import.meta.url);
  try {
    cachedBridge = req("@fanxipan/node") as CompilerNativeBridge;
    return cachedBridge;
  } catch {
    try {
      const here = path.dirname(fileURLToPath(import.meta.url));
      const localBridge = path.resolve(here, "../../fanxipan-node/index.js");
      cachedBridge = req(localBridge) as CompilerNativeBridge;
      return cachedBridge;
    } catch {
      cachedBridge = null;
      return null;
    }
  }
}

export function compileWithNative(source: string, filename: string): CompileResult | null {
  const bridge = resolveNativeBridge();
  if (!bridge) return null;
  const compileFn = bridge.compileRx ?? bridge.compile_for_node_json;
  if (!compileFn) return null;
  try {
    const raw = compileFn(source, filename);
    const parsed = JSON.parse(raw) as Omit<CompileResult, "map">;
    const diagnostics = (parsed.diagnostics ?? []).map((d) => ({
      ...d,
      severity: d.severity ?? "error",
    }));
    return {
      ...parsed,
      diagnostics,
      map: {
        version: 3,
        file: filename,
        sources: [filename],
        names: [],
        mappings: "",
        sourcesContent: [source],
      },
    };
  } catch {
    return null;
  }
}


