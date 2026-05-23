import { existsSync } from "node:fs";
import path from "node:path";
import { importAppModule } from "./module-loader.js";

export interface fanxikitConfig {
  base?: string;
  trailingSlash?: "always" | "never" | "ignore";
  appDir?: string;
  spa?: boolean | { fallback?: string };
  prerender?: {
    entries?: string[];
  };
  ssr?: boolean;
  csr?: boolean;
  outDir?: string;
  adapter?: { name: string; adapt(builder: unknown): Promise<void> | void };
  vite?: unknown;
  alias?: Record<string, string>;
}

export function defineConfig(config: fanxikitConfig): fanxikitConfig {
  return config;
}

export async function loadConfig(root = process.cwd()): Promise<fanxikitConfig> {
  const candidates = ["fanxikit.config.ts", "fanxikit.config.js", "fanxikit.config.mjs"];
  for (const name of candidates) {
    const file = path.resolve(root, name);
    if (!existsSync(file)) continue;
    const mod = await importAppModule(file, root);
    return normalizeConfig((mod.default ?? mod.config ?? mod) as fanxikitConfig);
  }
  return normalizeConfig({});
}

export function normalizeConfig(config: fanxikitConfig): fanxikitConfig {
  return {
    base: "/",
    trailingSlash: "ignore",
    appDir: "src",
    outDir: ".fanxikit",
    ssr: true,
    csr: true,
    ...config,
  };
}

