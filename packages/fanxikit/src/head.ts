import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { RouteManifest, RouteManifestEntry } from "./types.js";

export interface CollectedHead {
  title?: string;
  tags: string[];
  css: string[];
}

export function collectHeadAndCss(
  manifest: RouteManifest,
  entry: RouteManifestEntry
): CollectedHead {
  const chain = resolveLayoutChain(manifest, entry);
  let title: string | undefined;
  const tags: string[] = [];
  const css: string[] = [];
  for (const route of chain) {
    for (const file of route.files) {
      if (file.kind !== "layout" && file.kind !== "page" && file.kind !== "error") continue;
      const abs = path.resolve(manifest.root, manifest.routesDir, file.file);
      if (!existsSync(abs)) continue;
      const src = readFileSync(abs, "utf8");
      const parsed = extractHeadAndCssFromFanxi(src);
      if (parsed.title) title = parsed.title;
      tags.push(...parsed.tags);
      css.push(...parsed.css);
    }
  }
  return { title, tags: dedupe(tags), css: dedupe(css) };
}

export function extractHeadAndCssFromFanxi(source: string): CollectedHead {
  const tags: string[] = [];
  const css: string[] = [];
  let title: string | undefined;

  const titleMatch = source.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) title = stripTags(titleMatch[1]).trim();

  const metaMatches = source.matchAll(/<meta[^>]*>/gi);
  for (const m of metaMatches) tags.push(m[0]);

  const linkMatches = source.matchAll(/<link[^>]*>/gi);
  for (const m of linkMatches) tags.push(m[0]);

  const scriptMatches = source.matchAll(/<script[^>]*>[\s\S]*?<\/script>/gi);
  for (const m of scriptMatches) tags.push(m[0]);

  const styleMatches = source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  for (const m of styleMatches) css.push((m[1] ?? "").trim());

  return { title, tags, css };
}

function resolveLayoutChain(manifest: RouteManifest, entry: RouteManifestEntry): RouteManifestEntry[] {
  const out: RouteManifestEntry[] = [];
  for (let i = 0; i <= entry.segments.length; i += 1) {
    const id = i === 0 ? "/" : `/${entry.segments.slice(0, i).join("/")}`;
    const found = manifest.entries.find((x) => x.id === id);
    if (found) out.push(found);
  }
  return out;
}

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, "");
}

function dedupe(items: string[]): string[] {
  const set = new Set(items.map((x) => x.trim()).filter(Boolean));
  return Array.from(set);
}
