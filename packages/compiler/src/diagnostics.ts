import type { CompilerDiagnostic } from "./types.js";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type DeprecationEntry = {
  id: string;
  kind: "api" | "syntax" | "runtime";
  target?: string;
  migration?: string;
};

type DeprecationRegistry = {
  deprecations?: DeprecationEntry[];
};

let cachedDeprecations: DeprecationEntry[] | null = null;

export function analyzeTemplateBalance(source: string, filename: string): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  const pairs: Array<{ open: string; close: string; label: string }> = [
    { open: "{#if", close: "{/if}", label: "if" },
    { open: "{#for", close: "{/for}", label: "for" },
    { open: "{#await", close: "{/await}", label: "await" },
  ];

  for (const pair of pairs) {
    const opens = findTokenPositions(source, pair.open);
    const closes = findTokenPositions(source, pair.close);
    if (opens.length > closes.length) {
      const firstUnclosed = opens[closes.length] ?? opens[0];
      const loc = indexToLineColumn(source, firstUnclosed);
      diagnostics.push({
        severity: "error",
        code: "fanxipan_PARSE_MISSING_BLOCK_CLOSE",
        message: `Missing ${pair.close}`,
        filename,
        line: loc.line,
        column: loc.column,
        spanStart: firstUnclosed,
        spanEnd: firstUnclosed + pair.open.length,
        suggestion: `Add closing block ${pair.close} for ${pair.label}`,
        frame: formatCodeFrame(source, filename, loc.line, loc.column, firstUnclosed, firstUnclosed + pair.open.length),
      });
    }
  }

  if (!source.includes("{#if")) {
    for (const pos of findTokenPositions(source, "{:elif")) {
      const loc = indexToLineColumn(source, pos);
      diagnostics.push({
        severity: "error",
        code: "fanxipan_PARSE_UNEXPECTED_ELIF",
        message: "Unexpected {:elif}",
        filename,
        line: loc.line,
        column: loc.column,
        spanStart: pos,
        spanEnd: pos + "{:elif".length,
        suggestion: "Use {:elif} only inside {#if} ... {/if}",
        frame: formatCodeFrame(source, filename, loc.line, loc.column, pos, pos + "{:elif".length),
      });
    }
  }

  diagnostics.push(...analyzeDeprecations(source, filename));
  diagnostics.sort((a, b) => (a.line - b.line) || (a.column - b.column) || (a.message < b.message ? -1 : 1));
  return dedupeDiagnostics(diagnostics);
}

function analyzeDeprecations(source: string, filename: string): CompilerDiagnostic[] {
  const out: CompilerDiagnostic[] = [];
  for (const dep of loadDeprecations()) {
    if (dep.kind !== "syntax") continue;
    const token = toSearchToken(dep.target);
    if (!token) continue;
    const hits = findTokenPositions(source, token);
    if (hits.length === 0) continue;
    for (const hit of hits) {
      const loc = indexToLineColumn(source, hit);
      const code = `fanxipan_DEPRECATED[${dep.id}]`;
      out.push({
        severity: "warning",
        code,
        message: `${code} Deprecated syntax \`${token}\``,
        filename,
        line: loc.line,
        column: loc.column,
        spanStart: hit,
        spanEnd: hit + token.length,
        suggestion: dep.migration || "Follow migration guide in deprecation registry",
        frame: formatCodeFrame(source, filename, loc.line, loc.column, hit, hit + token.length),
      });
    }
  }
  return out;
}

function loadDeprecations(): DeprecationEntry[] {
  if (cachedDeprecations) return cachedDeprecations;
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const root = resolve(here, "../../../");
    const schemaPath = resolve(root, "schemas/deprecations.json");
    const raw = readFileSync(schemaPath, "utf8");
    const parsed = JSON.parse(raw) as DeprecationRegistry;
    cachedDeprecations = Array.isArray(parsed.deprecations) ? parsed.deprecations : [];
    return cachedDeprecations;
  } catch {
    cachedDeprecations = [];
    return cachedDeprecations;
  }
}

function toSearchToken(target?: string): string | null {
  if (!target) return null;
  const trimmed = target.trim();
  if (!trimmed) return null;
  return trimmed.replace("(...)", "(");
}

function findTokenPositions(source: string, token: string): number[] {
  const positions: number[] = [];
  let index = 0;
  while (index < source.length) {
    const found = source.indexOf(token, index);
    if (found === -1) break;
    positions.push(found);
    index = found + token.length;
  }
  return positions;
}

function indexToLineColumn(source: string, index: number): { line: number; column: number } {
  const safeIndex = Math.max(0, Math.min(index, source.length));
  const prefix = source.slice(0, safeIndex);
  const lines = prefix.split("\n");
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

function formatCodeFrame(
  source: string,
  filename: string,
  line: number,
  column: number,
  spanStart?: number,
  spanEnd?: number
): string {
  const lines = source.split("\n");
  const startLine = Math.max(1, line - 1);
  const endLine = Math.min(lines.length, line + 1);
  const out: string[] = [];
  out.push(`${filename}:${line}:${column}`);
  for (let ln = startLine; ln <= endLine; ln += 1) {
    const text = lines[ln - 1] ?? "";
    out.push(`${String(ln).padStart(4, " ")} | ${text}`);
    if (ln === line) {
      const len = markerLen(source, spanStart, spanEnd);
      out.push(`     | ${" ".repeat(Math.max(0, column - 1))}^${"~".repeat(Math.max(0, len - 1))}`);
    }
  }
  return out.join("\n");
}

function markerLen(source: string, spanStart?: number, spanEnd?: number): number {
  if (typeof spanStart !== "number" || typeof spanEnd !== "number" || spanEnd <= spanStart) return 1;
  const start = indexToLineColumn(source, spanStart);
  const end = indexToLineColumn(source, Math.max(spanStart, spanEnd - 1));
  if (start.line !== end.line) return 1;
  return Math.max(1, end.column - start.column + 1);
}

function dedupeDiagnostics(list: CompilerDiagnostic[]): CompilerDiagnostic[] {
  const out: CompilerDiagnostic[] = [];
  const seen = new Set<string>();
  for (const d of list) {
    const key = `${d.code ?? ""}|${d.line}|${d.column}|${d.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out;
}


