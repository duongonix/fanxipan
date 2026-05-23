import type { RouteManifest } from "./types.js";

export interface Diagnostic {
  code: string;
  message: string;
  file?: string;
  suggestion?: string;
}

export function validateRouteManifest(manifest: RouteManifest): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const byPath = new Map<string, string>();

  for (const entry of manifest.entries) {
    const owner = byPath.get(entry.path);
    if (owner && owner !== entry.id) {
      diagnostics.push({
        code: "fanxikit_ROUTE_CONFLICT",
        message: `Routes "${owner}" and "${entry.id}" both resolve to "${entry.path}".`,
        suggestion: "Rename one folder or move the route group so each URL maps to one route.",
      });
    } else {
      byPath.set(entry.path, entry.id);
    }

    const hasPage = entry.files.some((file) => file.kind === "page");
    const hasEndpoint = entry.files.some((file) => file.kind === "endpoint");
    if (!hasPage && !hasEndpoint && entry.files.some((file) => file.kind.endsWith("load") || file.kind.endsWith("server"))) {
      diagnostics.push({
        code: "fanxikit_ROUTE_WITHOUT_SURFACE",
        message: `Route "${entry.id}" has load/action files but no +page.fanxi or +server.ts.`,
        suggestion: "Add +page.fanxi for a page route or +server.ts for an endpoint route.",
      });
    }
  }

  return diagnostics;
}

export function throwIfDiagnostics(diagnostics: Diagnostic[]): void {
  if (diagnostics.length === 0) return;
  const text = diagnostics
    .map((d) => `${d.code}: ${d.message}${d.file ? `\n  at ${d.file}` : ""}${d.suggestion ? `\n  suggestion: ${d.suggestion}` : ""}`)
    .join("\n\n");
  throw new Error(text);
}
