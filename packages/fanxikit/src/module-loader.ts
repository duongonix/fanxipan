import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export async function importAppModule(file: string, root: string): Promise<Record<string, unknown>> {
  const abs = path.resolve(file);
  if (!abs.endsWith(".ts")) {
    return (await import(`${pathToFileURL(abs).href}?t=${Date.now()}`)) as Record<string, unknown>;
  }

  const ts = await import("typescript");
  const source = readFileSync(abs, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: abs,
  }).outputText;

  const code = rewriteImports(transpiled, path.dirname(abs));
  const cacheFile = path.resolve(root, ".fanxikit/runtime", toSafeRelative(root, abs).replace(/\.ts$/, ".mjs"));
  mkdirSync(path.dirname(cacheFile), { recursive: true });
  writeFileSync(cacheFile, code, "utf8");
  return (await import(`${pathToFileURL(cacheFile).href}?t=${Date.now()}`)) as Record<string, unknown>;
}

function rewriteImports(code: string, baseDir: string): string {
  return code
    .replace(/(from\s+["'])(\.[^"']+)(["'])/g, (_m, prefix: string, specifier: string, suffix: string) => {
      return `${prefix}${resolveRelativeSpecifier(baseDir, specifier)}${suffix}`;
    })
    .replace(/(import\s*\(\s*["'])(\.[^"']+)(["']\s*\))/g, (_m, prefix: string, specifier: string, suffix: string) => {
      return `${prefix}${resolveRelativeSpecifier(baseDir, specifier)}${suffix}`;
    });
}

function resolveRelativeSpecifier(baseDir: string, specifier: string): string {
  const abs = path.resolve(baseDir, specifier);
  return pathToFileURL(abs).href;
}

function toSafeRelative(root: string, abs: string): string {
  const rel = path.relative(root, abs);
  if (rel.startsWith("..")) {
    return abs.replace(/[:\\/]/g, "_");
  }
  return rel;
}
