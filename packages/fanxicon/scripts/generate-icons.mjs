import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(here, "..");
const rawIconsDir = path.join(pkgRoot, "raw-icons");
const generatedDir = path.join(pkgRoot, "src", "icons", "generated");
const metadataFile = path.join(pkgRoot, "src", "metadata", "icons.ts");
const indexFile = path.join(pkgRoot, "src", "index.ts");

const ALLOWED_TAGS = new Set(["path", "circle", "rect", "line", "polyline", "polygon", "ellipse"]);
const ALLOWED_ATTRS = new Set([
  "d",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "width",
  "height",
  "points",
]);
const RESERVED = new Set([
  "Do", "If", "In", "For", "New", "Try", "Case", "Class", "Const", "Default", "Delete", "Export", "Extends",
  "Finally", "Function", "Import", "Return", "Super", "Switch", "Throw", "Var", "Void", "While", "With", "Yield"
]);

export function kebabToPascalCase(input) {
  return input
    .split(/[^a-zA-Z0-9]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function normalizeComponentName(fileNameBase) {
  let name = kebabToPascalCase(fileNameBase);
  if (!name) name = "Icon";
  if (/^\d/.test(name)) name = `Icon${name}`;
  if (RESERVED.has(name)) name = `${name}Icon`;
  return name;
}

function parseAttrs(rawAttrs) {
  const out = {};
  const attrRx = /([:@A-Za-z0-9_-]+)\s*=\s*["']([^"']*)["']/g;
  for (const match of rawAttrs.matchAll(attrRx)) {
    const key = match[1];
    const value = match[2];
    if (ALLOWED_ATTRS.has(key)) out[key] = value;
  }
  return out;
}

export function extractSvgNodes(svgSource) {
  const out = [];
  const tagRx = /<(path|circle|rect|line|polyline|polygon|ellipse)\b([^>]*)\/?>/g;
  for (const match of svgSource.matchAll(tagRx)) {
    const tag = match[1];
    if (!ALLOWED_TAGS.has(tag)) continue;
    const attrs = parseAttrs(match[2] ?? "");
    out.push([tag, attrs]);
  }
  return out;
}

function renderGeneratedIcon(componentName, nodes) {
  return `import { createIcon } from "../../runtime/create-icon.js";

export const ${componentName} = createIcon(${JSON.stringify(componentName)}, ${JSON.stringify(nodes, null, 2)} as const);

export default ${componentName};
`;
}

function ensureUniqueName(candidate, usedNames) {
  if (!usedNames.has(candidate)) return candidate;
  let index = 2;
  while (usedNames.has(`${candidate}${index}`)) index += 1;
  return `${candidate}${index}`;
}

export function buildManifestFromRawIcons(iconDir = rawIconsDir) {
  const files = readdirSync(iconDir).filter((f) => f.endsWith(".svg")).sort();
  const usedNames = new Set();
  const manifest = [];

  for (const file of files) {
    const fileName = file.replace(/\.svg$/i, "");
    const componentName = ensureUniqueName(normalizeComponentName(fileName), usedNames);
    usedNames.add(componentName);
    const svgSource = readFileSync(path.join(iconDir, file), "utf8");
    const nodes = extractSvgNodes(svgSource);
    manifest.push({ fileName, componentName, nodes });
  }
  return manifest;
}

export function writeGeneratedFiles(manifest) {
  rmSync(generatedDir, { recursive: true, force: true });
  mkdirSync(generatedDir, { recursive: true });
  mkdirSync(path.dirname(metadataFile), { recursive: true });

  for (const item of manifest) {
    const outPath = path.join(generatedDir, `${item.componentName}.ts`);
    writeFileSync(outPath, renderGeneratedIcon(item.componentName, item.nodes), "utf8");
  }

  const exportsBlock = manifest
    .map((item) => `export { ${item.componentName} } from "./icons/generated/${item.componentName}.js";`)
    .join("\n");
  const typeBlock = `export type { IconProps } from "./types.js";\n`;
  writeFileSync(indexFile, `${exportsBlock}\n${typeBlock}`, "utf8");

  const metadata = manifest.map((item) => ({
    name: item.componentName,
    fileName: item.fileName,
    importName: item.componentName,
  }));
  writeFileSync(
    metadataFile,
    `export const icons = ${JSON.stringify(metadata, null, 2)} as const;\n`,
    "utf8",
  );
}

function main() {
  const manifest = buildManifestFromRawIcons(rawIconsDir);
  writeGeneratedFiles(manifest);
  console.log(`[fanxicon] generated ${manifest.length} icons`);
}

if (process.argv[1] && process.argv[1].endsWith("generate-icons.mjs")) {
  main();
}
