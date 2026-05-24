import type { CompileOptions, CompileResult, CompilerDiagnostic } from "./types.js";
import { analyzeTemplateBalance } from "./diagnostics.js";
import { compileWithNative } from "./native.js";

export function compile(source: string, options: CompileOptions): CompileResult {
  const legacyFormatDiagnostics = detectLegacySectionFormat(source, options.filename);
  const scriptDiagnostics = detectLikelyScriptReferenceErrors(source, options.filename);
  const normalizedSource = normalizeFanxiSource(source, options.filename);
  const nativeResult = compileWithNative(normalizedSource, options.filename);
  const finish = (result: CompileResult): CompileResult => ({
    ...result,
    diagnostics: dedupeCompilerDiagnostics([...result.diagnostics, ...legacyFormatDiagnostics, ...scriptDiagnostics]),
    map: {
      ...result.map,
      sourcesContent: [source],
    },
  });
  if (nativeResult) {
    const withImports = ensureSourceImports(nativeResult, normalizedSource);
    const withContract = ensureDefaultExport(withImports, normalizedSource, options.filename);
    const normalized = sanitizeNativeOutput(withContract, normalizedSource);
    return finish(injectHmr(normalized, options.hmr ?? true, options.filename));
  }
  return finish(injectHmr(compileWithFallbackTs(normalizedSource, options), options.hmr ?? true, options.filename));
}

function detectLikelyScriptReferenceErrors(source: string, filename: string): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  const lines = source.split("\n");
  const declared = new Set<string>();
  const known = new Set(["undefined", "null", "true", "false", "NaN", "Infinity"]);
  const reserved = new Set([
    "return",
    "if",
    "else",
    "for",
    "while",
    "switch",
    "case",
    "break",
    "continue",
    "const",
    "let",
    "var",
    "function",
    "export",
    "import",
    "try",
    "catch",
    "finally",
    "throw",
    "new",
    "typeof",
    "instanceof",
    "in",
    "of",
    "await",
    "async",
  ]);

  for (const line of lines) {
    const trimmed = line.trim();
    const varMatch = trimmed.match(/^(?:let|const|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\b/);
    if (varMatch) declared.add(varMatch[1]);
    const fnMatch = trimmed.match(/^function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/);
    if (fnMatch) declared.add(fnMatch[1]);
    if (trimmed.startsWith("import ")) {
      const fromIdx = trimmed.indexOf(" from ");
      const importPart = fromIdx >= 0 ? trimmed.slice(6, fromIdx).trim() : trimmed.slice(6).trim();
      if (importPart.startsWith("{") && importPart.endsWith("}")) {
        for (const p of importPart.slice(1, -1).split(",")) {
          const name = p.trim().split(/\s+as\s+/i).pop()?.trim();
          if (name && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) declared.add(name);
        }
      } else if (importPart.length > 0 && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(importPart)) {
        declared.add(importPart);
      }
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i] ?? "";
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("//")) continue;
    if (trimmed.startsWith("import ")) continue;
    if (/^(?:let|const|var|function|return|if|for|while|switch|export)\b/.test(trimmed)) continue;
    // Common typo: stray identifier statement like ";s" or "s;" after a valid line.
    const bare = trimmed.match(/^;?\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*;?\s*$/);
    if (!bare) continue;
    const ident = bare[1];
    if (declared.has(ident) || known.has(ident) || reserved.has(ident)) continue;
    const line = i + 1;
    const column = Math.max(1, raw.indexOf(ident) + 1);
    const spanStart = source.split("\n").slice(0, i).join("\n").length + (i > 0 ? 1 : 0) + Math.max(0, raw.indexOf(ident));
    const spanEnd = spanStart + ident.length;
    diagnostics.push({
      severity: "error",
      code: "fanxipan_SCRIPT_UNKNOWN_IDENTIFIER",
      message: `Unknown identifier '${ident}' in script scope`,
      filename,
      line,
      column,
      spanStart,
      spanEnd,
      suggestion: "Remove stray token or declare the identifier before use.",
      frame: formatCodeFrame(source, filename, line, column, spanStart, spanEnd),
    });
  }

  // Also catch trailing stray identifiers on the same line, e.g.:
  // let doubled = $derived(count * 2);s
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i] ?? "";
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("//")) continue;
    if (trimmed.startsWith("import ")) continue;
    const m =
      raw.match(/;\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*$/) ||
      raw.match(/\)\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*$/) ||
      raw.match(/\+\+\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*$/) ||
      raw.match(/--\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*$/);
    if (!m) continue;
    const ident = m[1];
    if (declared.has(ident) || known.has(ident) || reserved.has(ident)) continue;
    const line = i + 1;
    const column = Math.max(1, raw.lastIndexOf(ident) + 1);
    const spanStart = source.split("\n").slice(0, i).join("\n").length + (i > 0 ? 1 : 0) + Math.max(0, raw.lastIndexOf(ident));
    const spanEnd = spanStart + ident.length;
    diagnostics.push({
      severity: "error",
      code: "fanxipan_SCRIPT_UNKNOWN_IDENTIFIER",
      message: `Unknown identifier '${ident}' in script scope`,
      filename,
      line,
      column,
      spanStart,
      spanEnd,
      suggestion: "Remove stray token or declare the identifier before use.",
      frame: formatCodeFrame(source, filename, line, column, spanStart, spanEnd),
    });
  }

  return diagnostics;
}

function detectLegacySectionFormat(source: string, filename: string): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  const hits: Array<{ token: string; message: string; suggestion: string }> = [
    {
      token: "<script",
      message: "Legacy section format is not Fanxipan's canonical component syntax.",
      suggestion:
        "Use module-style .fanxi: imports at top, function Component(props) { return (...) }, export default Component.",
    },
    {
      token: "<style",
      message: "Legacy component style section is not Fanxipan's canonical style syntax.",
      suggestion:
        "Use export const styles = `...` for scoped component CSS, or import an external CSS file.",
    },
  ];
  for (const hit of hits) {
    const index = source.indexOf(hit.token);
    if (index < 0) continue;
    const loc = indexToLineColumn(source, index);
    diagnostics.push({
      severity: "warning",
      code: "fanxipan_LEGACY_SECTION_FORMAT",
      message: hit.message,
      filename,
      line: loc.line,
      column: loc.column,
      spanStart: index,
      spanEnd: index + hit.token.length,
      suggestion: hit.suggestion,
      frame: formatCodeFrame(source, filename, loc.line, loc.column, index, index + hit.token.length),
    });
  }
  return diagnostics;
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
  spanStart: number,
  spanEnd: number
): string {
  const lines = source.split("\n");
  const out = [`${filename}:${line}:${column}`];
  const text = lines[line - 1] ?? "";
  out.push(`${String(line).padStart(4, " ")} | ${text}`);
  out.push(`     | ${" ".repeat(Math.max(0, column - 1))}^${"~".repeat(Math.max(0, spanEnd - spanStart - 1))}`);
  return out.join("\n");
}

function dedupeCompilerDiagnostics(list: CompilerDiagnostic[]): CompilerDiagnostic[] {
  const out: CompilerDiagnostic[] = [];
  const seen = new Set<string>();
  for (const diagnostic of list) {
    const key = `${diagnostic.code ?? ""}|${diagnostic.line}|${diagnostic.column}|${diagnostic.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(diagnostic);
  }
  return out;
}

function normalizeFanxiSource(source: string, filename: string): string {
  if (hasClassicComponentShape(source)) return source;
  const sections = extractFanxiSections(source);
  const template = sections.template.trim();
  if (sections.scripts.length === 0 && sections.styles.length === 0 && !looksLikeTemplate(template)) {
    return source;
  }

  const componentName = sanitizeComponentName(extractNameFromFilename(filename));
  const hoisted: string[] = [];
  const setup: string[] = [];

  for (const script of sections.scripts) {
    const normalized = normalizeScriptSection(script.content);
    hoisted.push(...normalized.imports);
    if (script.module) {
      hoisted.push(normalized.body);
    } else {
      setup.push(normalized.body);
    }
  }

  const styleBlock = sections.styles.length > 0 ? `\nexport const styles = ${JSON.stringify(sections.styles.join("\n\n"))}` : "";
  const setupSource = setup.filter(Boolean).join("\n");
  const moduleSource = hoisted.filter(Boolean).join("\n");
  return `${moduleSource}
function ${componentName}(props = {}) {
${indent(setupSource, "  ")}
  return (
${indent(template, "    ")}
  )
}

export default ${componentName}
${styleBlock}
`;
}

function hasClassicComponentShape(source: string): boolean {
  return /function\s+[A-Za-z_$][A-Za-z0-9_$]*\s*\([^)]*\)\s*\{[\s\S]*?return\s*\(/m.test(source);
}

function looksLikeTemplate(input: string): boolean {
  const trimmed = input.trimStart();
  return trimmed.startsWith("<") || trimmed.startsWith("{#") || trimmed.startsWith("{@");
}

type ScriptSection = {
  attrs: string;
  content: string;
  module: boolean;
};

function extractFanxiSections(source: string): { scripts: ScriptSection[]; styles: string[]; template: string } {
  const scripts: ScriptSection[] = [];
  const styles: string[] = [];
  let template = source;

  template = template.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (_full, attrs: string, content: string) => {
    const module = /\bmodule\b/i.test(attrs) || /context\s*=\s*["']module["']/i.test(attrs);
    scripts.push({ attrs, content: content.trim(), module });
    return "";
  });

  template = template.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_full, content: string) => {
    styles.push(content.trim());
    return "";
  });

  return { scripts, styles, template };
}

function normalizeScriptSection(source: string): { imports: string[]; body: string } {
  const imports: string[] = [];
  const lines = convertExportLetProps(stripTypeScriptSyntax(source))
    .split("\n")
    .map((line) => line.trimEnd());
  const body: string[] = [];
  for (const line of lines) {
    if (line.trimStart().startsWith("import ")) {
      imports.push(line.trim());
    } else {
      body.push(line);
    }
  }
  return { imports, body: body.join("\n").trim() };
}

function convertExportLetProps(source: string): string {
  return source.replace(
    /^\s*export\s+let\s+([A-Za-z_$][A-Za-z0-9_$]*)(?:\s*:\s*[^=;\n]+)?(?:\s*=\s*([^;\n]+))?\s*;?\s*$/gm,
    (_full, name: string, fallback?: string) => {
      const value = fallback ? `props.${name} ?? (${fallback.trim()})` : `props.${name}`;
      return `let ${name} = ${value}`;
    },
  );
}

function stripTypeScriptSyntax(source: string): string {
  return source
    .replace(/^\s*interface\s+[A-Za-z_$][\w$]*[^{]*\{[\s\S]*?^\s*\}\s*$/gm, "")
    .replace(/^\s*type\s+[A-Za-z_$][\w$]*\s*=[\s\S]*?;\s*$/gm, "")
    .replace(/^\s*export\s+type\s+[A-Za-z_$][\w$]*\s*=[\s\S]*?;\s*$/gm, "")
    .replace(/^\s*export\s+interface\s+[A-Za-z_$][\w$]*[^{]*\{[\s\S]*?^\s*\}\s*$/gm, "")
    .replace(/\$state\s*<[^>]+>\s*\(/g, "$state(")
    .replace(/\$derived\s*<[^>]+>\s*\(/g, "$derived(")
    .replace(/(\b(?:let|const|var)\s+[A-Za-z_$][\w$]*)\s*:\s*[^=;\n]+(?=\s*=|\s*;|\s*$)/g, "$1")
    .replace(/\)\s*:\s*[A-Za-z_$][\w$<>\[\]|&.,\s]*\s*\{/g, ") {");
}

function extractNameFromFilename(filename: string): string {
  const slash = Math.max(filename.lastIndexOf("/"), filename.lastIndexOf("\\"));
  const base = filename.slice(slash + 1).replace(/\.[^.]+$/, "");
  return base || "FanxiComponent";
}

function sanitizeComponentName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9_$]/g, "_");
  if (/^[A-Za-z_$]/.test(cleaned)) return cleaned || "FanxiComponent";
  return `Fanxi_${cleaned}`;
}

function indent(source: string, prefix: string): string {
  if (!source.trim()) return "";
  return source
    .split("\n")
    .map((line) => (line.trim().length === 0 ? "" : `${prefix}${line}`))
    .join("\n");
}

function compileWithFallbackTs(source: string, options: CompileOptions): CompileResult {
  const diagnostics = analyzeTemplateBalance(source, options.filename);
  const componentName = extractComponentName(source) || "fanxipanComponent";
  const template = normalizeTemplate(extractReturnTemplate(source));
  const escapedTemplate = JSON.stringify(template);
  const escapedName = JSON.stringify(componentName);

  const code = [
    `/* compiled from ${options.filename} */`,
    `const __fanxipan_component_name = ${escapedName};`,
    `const __fanxipan_template = ${escapedTemplate};`,
    "const __fanxipan_hmr_state = (import.meta.hot && (import.meta.hot.data.__fanxipan_state ||= {})) || {};",
    "export const __fanxipan_HMR_BOUNDARY__ = true;",
    "export function create(target, ctx) {",
    "  const root = document.createElement('div');",
    "  root.setAttribute('data-fanxipan-component', __fanxipan_component_name);",
    "  root.innerHTML = String(__fanxipan_hmr_state.template ?? __fanxipan_template);",
    "  if (target) target.appendChild(root);",
    "  return () => {",
    "    __fanxipan_hmr_state.template = root.innerHTML || '';",
    "    if (root.parentNode) root.parentNode.removeChild(root);",
    "    if (ctx?.cleanupAll) ctx.cleanupAll();",
    "  };",
    "}",
    `export default function ${componentName}(target, ctx) {`,
    "  return create(target, ctx);",
    "}",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    code,
    diagnostics,
    map: {
      version: 3,
      file: options.filename,
      sources: [options.filename],
      names: [],
      mappings: "",
      sourcesContent: [source],
    },
  };
}

function injectHmr(input: CompileResult, enabled: boolean, filename: string): CompileResult {
  if (!enabled) return input;
  const hmrId = JSON.stringify(`rx:${filename}`);
  const needsState = !input.code.includes("__fanxipan_hmr_state");
  const hasAccept = input.code.includes("import.meta.hot.accept");
  if (hasAccept && !needsState) {
    return input;
  }
  if (hasAccept && needsState) {
    return {
      ...input,
      code: `const __fanxipan_hmr_state = (import.meta.hot && (import.meta.hot.data.__fanxipan_state ||= {})) || {};\n${input.code}`,
    };
  }
  const hmrSnippet = [
    needsState
      ? "const __fanxipan_hmr_state = (import.meta.hot && (import.meta.hot.data.__fanxipan_state ||= {})) || {};"
      : "",
    `const __fanxipan_HMR_ID__ = ${hmrId};`,
    "if (typeof __fanxipan_default_component === 'function') {",
    "  __fanxipan_default_component.__fanxipan_HMR_ID__ = __fanxipan_HMR_ID__;",
    "  __fanxipan_default_component.__fanxipan_HMR_SNAPSHOT__ = () => ({ ...__fanxipan_hmr_state });",
    "  __fanxipan_default_component.__fanxipan_HMR_RESTORE__ = (next) => {",
    "    if (!next || typeof next !== 'object') return;",
    "    Object.assign(__fanxipan_hmr_state, next);",
    "  };",
    "}",
    "if (import.meta.hot) {",
    "  import.meta.hot.accept((mod) => {",
    "    const next = (mod && mod.default) || __fanxipan_default_component;",
    "    if (globalThis.__fanxipan_HMR_APPLY__) {",
    "      globalThis.__fanxipan_HMR_APPLY__(__fanxipan_HMR_ID__, next);",
    "    }",
    "  });",
    "  import.meta.hot.dispose((data) => { data.__fanxipan_state = __fanxipan_hmr_state; });",
    "}",
  ].join("\n");
  return {
    ...input,
    code: `${input.code}\n${hmrSnippet}`,
  };
}

function extractComponentName(source: string): string | null {
  const match = source.match(/function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
  return match?.[1] ?? null;
}

function ensureSourceImports(input: CompileResult, source: string): CompileResult {
  const imports = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("import "));
  if (imports.length === 0) return input;
  let code = input.code;
  const missing = imports.filter((stmt) => !code.includes(stmt));
  if (missing.length === 0) return input;
  code = `${missing.join("\n")}\n${code}`;
  return { ...input, code };
}

function extractReturnTemplate(source: string): string {
  const match = source.match(/return\s*\(([^]*?)\)\s*}/m);
  return match?.[1]?.trim() ?? "";
}

function normalizeTemplate(input: string): string {
  return input
    .replace(/\{[^}]*\}/g, "")
    .replace(/<[A-Z][A-Za-z0-9_:-]*(\s[^>]*)?\/>/g, "")
    .replace(/<[A-Z][A-Za-z0-9_:-]*(\s[^>]*)?>[\s\S]*?<\/[A-Z][A-Za-z0-9_:-]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function ensureDefaultExport(input: CompileResult, source: string, filename: string): CompileResult {
  let code = input.code;
  const hmrId = JSON.stringify(`rx:${filename}`);
  if (code.includes("export default")) {
    code = code.replace(
      /export default function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*target\s*,\s*ctx\s*\)\s*\{/,
      "export default function $1(target, ctx, __props = {}, __children) {\n  __fanxipan_props = __props || {};\n  props = __fanxipan_props;\n  __fanxipan_children = __children;\n  children = __fanxipan_children;\n  if (typeof __fanxipan_bind_props === 'function') __fanxipan_bind_props();"
    );
    code = code.replace(
      /export default function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/,
      "const __fanxipan_default_component = function $1("
    );
    code += `\n__fanxipan_default_component.__fanxipan_HMR_ID__ = ${hmrId};\nexport default __fanxipan_default_component;\n`;
    if (!code.includes("let __fanxipan_props")) {
      code = injectAfterImports(
        code,
        "let __fanxipan_props = {};\nlet props = __fanxipan_props;\nlet __fanxipan_children = undefined;\nlet children = __fanxipan_children;\n"
      );
    }
    return { ...input, code: injectEffectHookIntoWrapper(code) };
  }
  const componentName = extractComponentName(source) || "fanxipanComponent";
    const wrapper = [
      "",
      `const __fanxipan_default_component = function ${componentName}(target, ctx, __props = {}, __children) {`,
      "  __fanxipan_props = __props || {};",
      "  props = __fanxipan_props;",
      "  __fanxipan_children = __children;",
      "  children = __fanxipan_children;",
      "  if (typeof __fanxipan_bind_props === 'function') __fanxipan_bind_props();",
      "  return create(target, ctx);",
      "};",
    `__fanxipan_default_component.__fanxipan_HMR_ID__ = ${hmrId};`,
    "export default __fanxipan_default_component;",
  ].join("\n");
  return {
    ...input,
    code: injectEffectHookIntoWrapper(
      injectAfterImports(
        `${input.code}${wrapper}`,
        "let __fanxipan_props = {};\nlet props = __fanxipan_props;\nlet __fanxipan_children = undefined;\nlet children = __fanxipan_children;\n"
      )
    ),
  };
}

function sanitizeNativeOutput(input: CompileResult, source: string): CompileResult {
  if (!shouldRunLegacyCompatPass(input.code)) {
    return input;
  }
  let code = input.code;
  code = code.replace(
    /\(event\)\s*=>\s*\{\s*(\([^)]*\)\s*=>\s*[^;]+)\(event\);\s*\}/g,
    "(event) => { ($1)(event); }"
  );
  const { imports: _imports, setup, derivedExprs, effectCalls } = extractComponentSetup(source);
  if (setup) {
    const expandedDerived = expandDerivedExpressions(derivedExprs);
    const effectDefs = effectCalls
      .map((effect) => {
        const depsSrc = effect.deps.map((d) => JSON.stringify(d)).join(", ");
        let runExpr = effect.fn;
        for (const [name, expr] of expandedDerived) {
          runExpr = replaceIdentifierOutsideStrings(runExpr, name, `(${expr})`);
        }
        return `{ deps: [${depsSrc}], run: ${runExpr} }`;
      })
      .join(", ");
    const prelude = [
      "const $state = (v) => v;",
      "const $derived = (v) => v;",
      "const $dericved = (v) => v;",
      `const __fanxipan_effect_defs = [${effectDefs}];`,
      "const __fanxipan_mount_defs = [];",
      "const __fanxipan_unmount_defs = [];",
      "const $effect = () => {};",
      "const $emit = (name, detail) => { const base = String(name || ''); const key = `on${base.charAt(0).toUpperCase()}${base.slice(1)}`; const lower = `on${base.toLowerCase()}`; const fn = props && (props[key] || props[lower]); if (typeof fn === 'function') return fn(detail); };",
      "const $mount = (fn) => { if (typeof fn === 'function') __fanxipan_mount_defs.push(fn); };",
      "const $unmount = (fn) => { if (typeof fn === 'function') __fanxipan_unmount_defs.push(fn); };",
      "const $nextTick = () => Promise.resolve();",
      "const $global = (v) => v;",
      "const $inspect = Object.assign((v, label = 'fanxipan:inspect') => { if (typeof console !== 'undefined') console.debug(label, v); return v; }, { trace(label = 'fanxipan:trace') { if (typeof console !== 'undefined') console.trace(label); } });",
      setup,
      "",
    ].join("\n");
    code = injectAfterImports(code, `${prelude}\n`);
  }
  if (derivedExprs.size > 0) {
    const expanded = expandDerivedExpressions(derivedExprs);
    for (const [name, expr] of expanded) {
      code = replaceIdentifierOutsideStrings(code, name, `(${expr})`);
    }
  }
  return code === input.code ? input : { ...input, code };
}

function replaceIdentifierOutsideStrings(code: string, name: string, replacement: string): string {
  let out = "";
  let i = 0;
  let quote: string | null = null;
  const isStart = (ch: string | undefined) => !!ch && /[A-Za-z_$]/.test(ch);
  const isPart = (ch: string | undefined) => !!ch && /[A-Za-z0-9_$]/.test(ch);
  while (i < code.length) {
    const ch = code[i];
    if (quote) {
      out += ch;
      if (ch === "\\") {
        i += 1;
        if (i < code.length) out += code[i];
      } else if (ch === quote) {
        quote = null;
      }
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }
    if (isStart(ch)) {
      const start = i;
      i += 1;
      while (i < code.length && isPart(code[i])) i += 1;
      const ident = code.slice(start, i);
      if (ident === name && looksLikeObjectShorthandProperty(code, start, i)) {
        out += `${ident}: ${replacement}`;
      } else if (ident === name && looksLikeObjectPropertyKey(code, start, i)) {
        out += ident;
      } else {
        out += ident === name ? replacement : ident;
      }
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function looksLikeObjectShorthandProperty(code: string, start: number, end: number): boolean {
  let prev = start - 1;
  while (prev >= 0 && /\s/.test(code[prev])) prev -= 1;
  let next = end;
  while (next < code.length && /\s/.test(code[next])) next += 1;
  return currentEnclosingDelimiter(code, start) === "{" && (code[prev] === "{" || code[prev] === ",") && (code[next] === "," || code[next] === "}");
}

function looksLikeObjectPropertyKey(code: string, start: number, end: number): boolean {
  let prev = start - 1;
  while (prev >= 0 && /\s/.test(code[prev])) prev -= 1;
  let next = end;
  while (next < code.length && /\s/.test(code[next])) next += 1;
  return currentEnclosingDelimiter(code, start) === "{" && (code[prev] === "{" || code[prev] === ",") && code[next] === ":";
}

function currentEnclosingDelimiter(code: string, index: number): string | null {
  const stack: string[] = [];
  let quote: string | null = null;
  for (let i = 0; i < index; i += 1) {
    const ch = code[i];
    if (quote) {
      if (ch === "\\") {
        i += 1;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "{" || ch === "(" || ch === "[") {
      stack.push(ch);
      continue;
    }
    if (ch === "}" || ch === ")" || ch === "]") {
      stack.pop();
    }
  }
  return stack[stack.length - 1] ?? null;
}

function shouldRunLegacyCompatPass(code: string): boolean {
  const envFlag = typeof process !== "undefined" ? process.env.fanxipan_LEGACY_COMPAT_PASS : undefined;
  if (envFlag === "0" || envFlag === "false") return false;
  // Keep compat pass on by default because native output currently still
  // requires script/setup bridging from source (imports, state/effect shims).
  return true;
}

function extractComponentSetup(source: string): {
  imports: string[];
  setup: string;
  derivedExprs: Map<string, string>;
  effectCalls: Array<{ fn: string; deps: string[] }>;
  bindables: Array<{ name: string; fallback?: string }>;
} {
  const derivedExprs = new Map<string, string>();
  const effectCalls: Array<{ fn: string; deps: string[] }> = [];
  const bindables = new Map<string, string | undefined>();
  const imports = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("import "));
  const headerMatch = source.match(/function\s+[A-Za-z_][A-Za-z0-9_]*\s*\(([^)]*)\)\s*\{/m);
  const match = source.match(/function\s+[A-Za-z_][A-Za-z0-9_]*\s*\([^)]*\)\s*\{([\s\S]*?)return\s*\(/m);
  if (!match) return { imports, setup: "", derivedExprs, effectCalls, bindables: [] };
  const param = (headerMatch?.[1] ?? "").trim();
  const body = match[1] ?? "";
  const rawLines = splitSetupStatements(body)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith("import ") && !line.startsWith("export "));
  const paramPrelude = buildParamPrelude(param);
  for (const b of paramPrelude.bindables) bindables.set(b.name, b.fallback);
  if (rawLines.length === 0) {
    const setup = paramPrelude.lines
      .map((line) => (line.endsWith(";") ? line : `${line};`))
      .join("\n");
    return {
      imports,
      setup: injectBindableBridge(setup, bindables),
      derivedExprs,
      effectCalls,
      bindables: Array.from(bindables.entries()).map(([name, fallback]) => ({ name, fallback })),
    };
  }
  const lines: string[] = [];
  const stateNames: string[] = [];
  const derivedNames: string[] = [];
  const derivedDeps = new Map<string, string[]>();
  for (const line of rawLines) {
    const stateMatch = line.match(/^let\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\$state\(/);
    if (stateMatch) {
      stateNames.push(stateMatch[1]);
    }
    const d = line.match(/^let\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\$derived\(([\s\S]+)\)\s*;?$/);
    if (d) {
      derivedExprs.set(d[1], d[2].trim());
      derivedNames.push(d[1]);
      derivedDeps.set(d[1], extractIdentifiers(d[2]).filter((id) => stateNames.includes(id)));
      continue;
    }
    const effectArg = extractCallArg(line, "$effect(");
    if (effectArg) {
      const deps = expandEffectDeps(
        extractIdentifiers(effectArg).filter((id) => stateNames.includes(id) || derivedNames.includes(id)),
        derivedDeps
      );
      effectCalls.push({ fn: effectArg, deps });
      continue;
    }
    const bindableMatch = line.match(
      /^let\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\$bindable\(\s*([\s\S]*?)\s*\)\s*;?$/
    );
    if (bindableMatch) {
      bindables.set(
        bindableMatch[1],
        bindableMatch[2] && bindableMatch[2].trim().length > 0
          ? bindableMatch[2].trim()
          : undefined
      );
      lines.push(
        `let ${bindableMatch[1]} = (props.${bindableMatch[1]} ?? ${
          bindableMatch[2] && bindableMatch[2].trim().length > 0
            ? bindableMatch[2].trim()
            : "undefined"
        })`
      );
      continue;
    }
    lines.push(line);
  }
  const setup = [...paramPrelude.lines, ...lines]
    .map((line) => ensureStatementTerminator(line))
    .join("\n");
  return {
    imports,
    setup: injectBindableBridge(setup, bindables),
    derivedExprs,
    effectCalls,
    bindables: Array.from(bindables.entries()).map(([name, fallback]) => ({ name, fallback })),
  };
}

function splitSetupStatements(source: string): string[] {
  const out: string[] = [];
  let start = 0;
  let paren = 0;
  let brace = 0;
  let bracket = 0;
  let quote: string | null = null;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\") {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "(") paren += 1;
    else if (ch === ")") paren -= 1;
    else if (ch === "{") brace += 1;
    else if (ch === "}") brace -= 1;
    else if (ch === "[") bracket += 1;
    else if (ch === "]") bracket -= 1;

    const balanced = paren <= 0 && brace <= 0 && bracket <= 0;
    if ((ch === ";" || ch === "\n") && balanced) {
      const stmt = source.slice(start, ch === ";" ? i + 1 : i).trim();
      if (stmt) out.push(stmt);
      start = i + 1;
    }
  }
  const tail = source.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

function ensureStatementTerminator(line: string): string {
  const trimmed = line.trimEnd();
  if (trimmed.endsWith(";") || trimmed.endsWith("}")) return trimmed;
  return `${trimmed};`;
}

function buildParamPrelude(param: string): {
  lines: string[];
  bindables: Array<{ name: string; fallback?: string }>;
} {
  if (!param) return { lines: [], bindables: [] };
  const singleBindable = param.match(
    /^([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*\$bindable\(\s*([\s\S]*?)\s*\)$/
  );
  if (singleBindable) {
    const name = singleBindable[1];
    const fallback =
      singleBindable[2] && singleBindable[2].trim().length > 0
        ? singleBindable[2].trim()
        : undefined;
    return {
      lines: [
        `let ${name}`,
        `const __fanxipan_bind_props = () => (${name} = (props.${name} ?? ${
          fallback ?? "undefined"
        }))`,
      ],
      bindables: [{ name, fallback }],
    };
  }
  if (param.startsWith("{") && param.endsWith("}")) {
    const names = extractDestructuredNames(param);
    if (names.length === 0) return { lines: [], bindables: [] };
    const lets = names.map((name) => `let ${name}`);
    const assign = `const __fanxipan_bind_props = () => (${param} = props)`;
    const bindables = extractDestructuredBindableEntries(param);
    return { lines: [...lets, assign], bindables };
  }
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(param) && param !== "props") {
    return {
      lines: [`let ${param}`, `const __fanxipan_bind_props = () => (${param} = props)`],
      bindables: [],
    };
  }
  return { lines: [], bindables: [] };
}

function extractDestructuredBindableEntries(
  param: string
): Array<{ name: string; fallback?: string }> {
  const inner = param.slice(1, -1).trim();
  if (!inner) return [];
  const out: Array<{ name: string; fallback?: string }> = [];
  for (const partRaw of inner.split(",")) {
    const part = partRaw.trim();
    if (!part || part.startsWith("...")) continue;
    const [lhs, rhs] = part.split("=").map((v) => v?.trim());
    if (!rhs || !rhs.startsWith("$bindable(")) continue;
    const local = (lhs.includes(":") ? lhs.split(":")[1] : lhs).trim();
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(local)) continue;
    const fallback = extractCallArg(rhs, "$bindable(") ?? "";
    out.push({
      name: local,
      fallback: fallback.trim().length > 0 ? fallback.trim() : undefined,
    });
  }
  return out;
}

function injectBindableBridge(
  setup: string,
  bindables: Map<string, string | undefined>
): string {
  if (bindables.size === 0) return setup;
  const body: string[] = [setup];
  body.push("const __fanxipan_emit_bindable = (dep) => {");
  body.push("  if (!props || typeof dep !== 'string') return;");
  for (const [name] of bindables.entries()) {
    const cap = `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
    body.push(`  if (dep === ${JSON.stringify(name)}) {`);
    body.push(`    props[${JSON.stringify(name)}] = ${name};`);
    body.push(
      `    const __fanxipan_cb = props[${JSON.stringify(
        `on${cap}Change`
      )}] || props[${JSON.stringify(`on${name}change`)}];`
    );
    body.push("    if (typeof __fanxipan_cb === 'function') __fanxipan_cb(" + name + ");");
    body.push("  }");
  }
  body.push("};");
  return body.join("\n");
}

function extractDestructuredNames(param: string): string[] {
  const inner = param.slice(1, -1).trim();
  if (!inner) return [];
  const out: string[] = [];
  for (const partRaw of inner.split(",")) {
    const part = partRaw.trim();
    if (!part || part.startsWith("...")) continue;
    const noDefault = part.split("=")[0].trim();
    const local = noDefault.includes(":") ? noDefault.split(":")[1].trim() : noDefault;
    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(local)) {
      out.push(local);
    }
  }
  return Array.from(new Set(out));
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function injectEffectHookIntoWrapper(code: string): string {
  const marker = "if (typeof __fanxipan_bind_props === 'function') __fanxipan_bind_props();";
  const hook = [
    "  const __fanxipan_attach_effects = () => {",
    "    const __fanxipan_effect_defs_local = (typeof __fanxipan_effect_defs !== 'undefined' && Array.isArray(__fanxipan_effect_defs)) ? __fanxipan_effect_defs : [];",
    "    const __fanxipan_mount_defs_local = (typeof __fanxipan_mount_defs !== 'undefined' && Array.isArray(__fanxipan_mount_defs)) ? __fanxipan_mount_defs : [];",
    "    const __fanxipan_unmount_defs_local = (typeof __fanxipan_unmount_defs !== 'undefined' && Array.isArray(__fanxipan_unmount_defs)) ? __fanxipan_unmount_defs : [];",
    "    let __fanxipan_lifecycle_cleanups = [];",
    "    for (const hook of __fanxipan_mount_defs_local) { const ret = hook(); if (typeof ret === 'function') __fanxipan_lifecycle_cleanups.push(ret); }",
    "    if (!ctx || __fanxipan_effect_defs_local.length === 0) return () => { for (const c of __fanxipan_lifecycle_cleanups.splice(0)) c(); for (const hook of __fanxipan_unmount_defs_local) hook(); };",
    "    let __fanxipan_cleanups = [];",
    "    let __fanxipan_pending = false;",
    "    let __fanxipan_changed = null;",
    "    const __fanxipan_run_effects = () => {",
    "      const changed = __fanxipan_changed;",
    "      __fanxipan_changed = null;",
    "      if (Array.isArray(changed) && changed.length > 0) {",
    "        const touched = __fanxipan_effect_defs_local.some((ef) => !ef.deps || ef.deps.length === 0 || ef.deps.some((d) => changed.includes(d)));",
    "        if (!touched) return;",
    "      }",
    "      for (const c of __fanxipan_cleanups.splice(0)) c();",
    "      for (const ef of __fanxipan_effect_defs_local) {",
    "        if (Array.isArray(changed) && changed.length > 0 && Array.isArray(ef.deps) && ef.deps.length > 0) {",
    "          if (!ef.deps.some((d) => changed.includes(d))) continue;",
    "        }",
    "        const ret = ef.run();",
    "        if (typeof ret === 'function') __fanxipan_cleanups.push(ret);",
    "      }",
    "    };",
    "    const __fanxipan_schedule = (changed = null) => {",
    "      if (Array.isArray(changed)) __fanxipan_changed = Array.from(new Set([...(Array.isArray(__fanxipan_changed) ? __fanxipan_changed : []), ...changed]));",
    "      if (__fanxipan_pending) return;",
    "      __fanxipan_pending = true;",
    "      queueMicrotask(() => {",
    "        __fanxipan_pending = false;",
    "        __fanxipan_run_effects();",
    "      });",
    "    };",
    "    const __fanxipan_notify = typeof ctx.notify === 'function' ? ctx.notify.bind(ctx) : null;",
    "    const __fanxipan_notifyMany = typeof ctx.notifyMany === 'function' ? ctx.notifyMany.bind(ctx) : null;",
    "    const __fanxipan_emit_bindable_local = (typeof __fanxipan_emit_bindable === 'function') ? __fanxipan_emit_bindable : null;",
    "    if (__fanxipan_notify) ctx.notify = (dep) => { __fanxipan_notify(dep); if (__fanxipan_emit_bindable_local) __fanxipan_emit_bindable_local(dep); __fanxipan_schedule([dep]); };",
    "    if (__fanxipan_notifyMany) ctx.notifyMany = (deps) => { __fanxipan_notifyMany(deps); if (__fanxipan_emit_bindable_local && Array.isArray(deps)) { for (const dep of deps) __fanxipan_emit_bindable_local(dep); } __fanxipan_schedule(Array.isArray(deps) ? deps : []); };",
    "    __fanxipan_schedule(null);",
    "    return () => {",
    "      if (__fanxipan_notify) ctx.notify = __fanxipan_notify;",
    "      if (__fanxipan_notifyMany) ctx.notifyMany = __fanxipan_notifyMany;",
    "      for (const c of __fanxipan_cleanups.splice(0)) c();",
    "      for (const c of __fanxipan_lifecycle_cleanups.splice(0)) c();",
    "      for (const hook of __fanxipan_unmount_defs_local) hook();",
    "    };",
    "  };",
    "  const __fanxipan_detach_effects = __fanxipan_attach_effects();",
  ].join("\n");
  if (!code.includes(marker)) return code;
  let next = code.replace(marker, `${marker}\n${hook}`);
  next = next.replace(
    "return create(target, ctx);",
    "const __fanxipan_out = create(target, ctx);\n  return () => { if (typeof __fanxipan_detach_effects === 'function') __fanxipan_detach_effects(); if (typeof __fanxipan_out === 'function') __fanxipan_out(); };"
  );
  return next;
}

function extractCallArg(input: string, marker: string): string | null {
  const idx = input.indexOf(marker);
  if (idx < 0) return null;
  const start = idx + marker.length;
  let depth = 1;
  for (let i = start; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === "(") depth += 1;
    if (ch === ")") {
      depth -= 1;
      if (depth === 0) return input.slice(start, i).trim();
    }
  }
  return null;
}

function extractIdentifiers(input: string): string[] {
  const matches = input.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) ?? [];
  return Array.from(new Set(matches));
}

function expandEffectDeps(deps: string[], derivedDeps: Map<string, string[]>): string[] {
  const out = new Set<string>();
  for (const dep of deps) {
    if (derivedDeps.has(dep)) {
      for (const d of derivedDeps.get(dep) ?? []) out.add(d);
    } else {
      out.add(dep);
    }
  }
  return Array.from(out);
}

function expandDerivedExpressions(derivedExprs: Map<string, string>): Map<string, string> {
  const memo = new Map<string, string>();
  const visiting = new Set<string>();

  const expandOne = (name: string): string => {
    if (memo.has(name)) return memo.get(name)!;
    if (visiting.has(name)) return derivedExprs.get(name) ?? name;
    visiting.add(name);
    let expr = derivedExprs.get(name) ?? name;
    for (const dep of derivedExprs.keys()) {
      if (dep === name) continue;
      const depPattern = new RegExp(`\\b${escapeRegex(dep)}\\b`, "g");
      if (depPattern.test(expr)) {
        const expandedDep = expandOne(dep);
        expr = expr.replace(depPattern, `(${expandedDep})`);
      }
    }
    visiting.delete(name);
    memo.set(name, expr);
    return expr;
  };

  const out = new Map<string, string>();
  for (const name of derivedExprs.keys()) {
    out.set(name, expandOne(name));
  }
  return out;
}

function injectAfterImports(code: string, insert: string): string {
  const lines = code.split("\n");
  let idx = 0;
  while (idx < lines.length) {
    const line = lines[idx].trim();
    if (line.startsWith("import ")) {
      idx += 1;
      continue;
    }
    if (line === "") {
      idx += 1;
      continue;
    }
    break;
  }
  return [...lines.slice(0, idx), insert.trimEnd(), ...lines.slice(idx)].join("\n");
}


