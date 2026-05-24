import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { compile } from "@fanxipan/compiler";
import { matchManifestRoute } from "./match.js";
import { serializeForHtml } from "./serialization.js";
import type { RouteManifest, RouteManifestEntry } from "./types.js";

export function renderHtmlShell(input: {
  url: URL;
  manifest: RouteManifest;
  data?: Record<string, unknown>;
  status?: number;
  error?: { message: string; routeId?: string };
  head?: { title?: string; tags: string[] };
  css?: string[];
  serialized?: string;
}): string {
  const match = matchManifestRoute(input.manifest, input.url.pathname);
  const title = input.error
    ? `fanxikit error ${input.status ?? 500}`
    : match
      ? `fanxikit - ${input.url.pathname}`
      : "fanxikit";
  const routeData = match
    ? JSON.stringify({ id: match.entry.id, path: match.entry.path, params: match.params })
    : "null";
  const routeUi = match ? composeRouteUi(input.manifest, match.entry) : "";
  const data = JSON.stringify(input.data ?? null);
  const serialized = input.serialized ?? serializeForHtml(input.data ?? null);
  const hydration = match ? resolveHydrationPlan(input.manifest, match.entry) : null;
  const errorBlock = input.error
    ? `<section data-fanxikit-error="1"><h2>${escapeHtml(input.error.message)}</h2><p>Route: ${escapeHtml(input.error.routeId ?? match?.entry.id ?? "unknown")}</p></section>`
    : "";

  const headTitle = input.head?.title ?? title;
  const headTags = (input.head?.tags ?? []).join("\n  ");
  const cssBlock = (input.css ?? [])
    .map((chunk: string) => `<style data-fanxikit-ssr>${escapeHtml(chunk)}</style>`)
    .join("\n  ");

  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head>",
    "  <meta charset=\"utf-8\" />",
    "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
    `  <title>${escapeHtml(headTitle)}</title>`,
    `  ${headTags}`,
    `  ${cssBlock}`,
    "</head>",
    "<body>",
    "  <div id=\"app\">",
    routeUi
      ? `    <section data-route-id="${escapeHtml(match?.entry.id ?? "")}" data-fanxikit-view>${routeUi}</section>`
      : `    <main data-route-id="${escapeHtml(match?.entry.id ?? "")}"></main>`,
    errorBlock ? `    ${errorBlock}` : "",
    "  </div>",
    `  <script>window.__fanxikit_ROUTE__=${routeData};</script>`,
    `  <script>window.__fanxikit_DATA__=${data};</script>`,
    `  <script>window.__fanxikit_HYDRATE__=${JSON.stringify(hydration)};</script>`,
    `  <script id="__fanxikit_payload" type="application/json">${serialized}</script>`,
    "  <script type=\"module\">",
    hydrationBootstrapScript(),
    "  </script>",
    "</body>",
    "</html>",
  ].join("\n");
}

interface HydrationPlan {
  component: string;
  strategy: "load" | "idle" | "visible";
}

function composeRouteUi(manifest: RouteManifest, entry: RouteManifestEntry): string {
  const pageFile = entry.files.find((f) => f.kind === "page");
  if (!pageFile) return "";

  const pageMarkup = readFanxiMarkup(manifest, pageFile.file);
  if (!pageMarkup) return "";

  let current = pageMarkup;
  const chain = resolveLayoutChain(manifest, entry).reverse();
  for (const routeEntry of chain) {
    const layoutFile = routeEntry.files.find((f) => f.kind === "layout");
    if (!layoutFile) continue;
    const layoutMarkup = readFanxiMarkup(manifest, layoutFile.file);
    if (!layoutMarkup) continue;
    if (layoutMarkup.includes("<slot />")) {
      current = layoutMarkup.replaceAll("<slot />", current);
      continue;
    }
    if (layoutMarkup.includes("<slot/>")) {
      current = layoutMarkup.replaceAll("<slot/>", current);
      continue;
    }
    current = `${layoutMarkup}\n${current}`;
  }
  return current;
}

function resolveLayoutChain(manifest: RouteManifest, entry: RouteManifestEntry): RouteManifestEntry[] {
  const result: RouteManifestEntry[] = [];
  for (let i = 0; i <= entry.segments.length; i += 1) {
    const id = i === 0 ? "/" : `/${entry.segments.slice(0, i).join("/")}`;
    const found = manifest.entries.find((x) => x.id === id);
    if (found) result.push(found);
  }
  return result;
}

function readFanxiMarkup(manifest: RouteManifest, file: string): string {
  const abs = path.resolve(manifest.root, manifest.routesDir, file);
  if (!existsSync(abs)) return "";
  const source = readFileSync(abs, "utf8");
  return compileFanxiMarkup(source, abs);
}

function resolveHydrationPlan(manifest: RouteManifest, entry: RouteManifestEntry): HydrationPlan | null {
  const pageFile = entry.files.find((f) => f.kind === "page");
  if (!pageFile) return null;
  const markup = readFanxiMarkup(manifest, pageFile.file);
  const strategy = readHydrationStrategy(markup);
  const component = `/${[manifest.routesDir, pageFile.file].join("/").replace(/\\/g, "/")}`;
  return { component, strategy };
}

function readHydrationStrategy(markup: string): "load" | "idle" | "visible" {
  const hit = markup.match(/data-hydrate=(["'])(load|idle|visible)\1/i);
  const strategy = hit?.[2]?.toLowerCase();
  if (strategy === "idle" || strategy === "visible") return strategy;
  return "load";
}

function hydrationBootstrapScript(): string {
  return [
    "const __fanxikitHydration = window.__fanxikit_HYDRATE__;",
    "if (__fanxikitHydration && __fanxikitHydration.component) {",
    "  const __fanxikitRun = async () => {",
    "    try {",
    "      const [{ default: fanxipan }, mod] = await Promise.all([",
    "        import(\"fanxipan\"),",
    "        import(__fanxikitHydration.component),",
    "      ]);",
    "      const component = mod?.default ?? mod;",
    "      const host = document.querySelector(\"[data-fanxikit-view]\");",
    "      if (!host || typeof component !== \"function\") return;",
    "      fanxipan.render(component, host, { clearTarget: true });",
    "    } catch {",
    "      // graceful fallback: keep server-rendered HTML static",
    "    }",
    "  };",
    "  const strategy = __fanxikitHydration.strategy || \"load\";",
    "  if (strategy === \"idle\") {",
    "    const idle = window.requestIdleCallback;",
    "    if (typeof idle === \"function\") idle(() => { void __fanxikitRun(); });",
    "    else setTimeout(() => { void __fanxikitRun(); }, 32);",
    "  } else if (strategy === \"visible\") {",
    "    const host = document.querySelector(\"[data-fanxikit-view]\");",
    "    if (!host || typeof window.IntersectionObserver !== \"function\") {",
    "      void __fanxikitRun();",
    "    } else {",
    "      const obs = new IntersectionObserver((entries) => {",
    "        for (const entry of entries) {",
    "          if (!entry.isIntersecting) continue;",
    "          obs.disconnect();",
    "          void __fanxikitRun();",
    "          break;",
    "        }",
    "      });",
    "      obs.observe(host);",
    "    }",
    "  } else {",
    "    if (document.readyState === \"loading\") {",
    "      document.addEventListener(\"DOMContentLoaded\", () => { void __fanxikitRun(); }, { once: true });",
    "    } else {",
    "      void __fanxikitRun();",
    "    }",
    "  }",
    "}",
  ].join("\n");
}

function compileFanxiMarkup(source: string, filename: string): string {
  const template = extractReturnTemplate(source);
  if (template) {
    return normalizeTemplate(template);
  }

  try {
    const result = compile(source, { filename, hmr: false });
    const compiledTemplate = extractTemplateFromCompiledCode(result.code);
    if (compiledTemplate) return compiledTemplate;
  } catch {
    // fallback below
  }
  return "";
}

function extractTemplateFromCompiledCode(code: string): string {
  const nativeChunks: string[] = [];
  const nativePattern = /__fanxipan_tpl_[A-Za-z0-9_$]+\s*\.innerHTML\s*=\s*`([\s\S]*?)`\s*;/g;
  for (const match of code.matchAll(nativePattern)) {
    nativeChunks.push(match[1] ?? "");
  }
  if (nativeChunks.length > 0) {
    return nativeChunks.join("").trim();
  }

  const templateMatch = code.match(/const\s+__fanxipan_template\s*=\s*("([^"\\]|\\.)*"|'([^'\\]|\\.)*')\s*;/);
  if (!templateMatch) return "";
  const literal = templateMatch[1];
  try {
    if (literal.startsWith("'")) {
      const normalized = `"${literal.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"')}"`;
      return JSON.parse(normalized);
    }
    return JSON.parse(literal);
  } catch {
    return "";
  }
}

function extractReturnTemplate(source: string): string {
  const idx = source.indexOf("return");
  if (idx < 0) return "";
  const open = source.indexOf("(", idx);
  if (open < 0) return "";
  let depth = 0;
  let quote: "'" | "\"" | "`" | null = null;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\") {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === "\"" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "(") {
      depth += 1;
      continue;
    }
    if (ch === ")") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(open + 1, i).trim();
      }
    }
  }
  return "";
}

function normalizeTemplate(input: string): string {
  if (!input) return "";
  return input.trim();
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}


