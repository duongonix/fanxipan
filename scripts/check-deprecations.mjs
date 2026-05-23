import { readFile } from "node:fs/promises";

const registryPath = new URL("../schemas/deprecations.json", import.meta.url);
const changelogPath = new URL("../CHANGELOG.md", import.meta.url);

function parseSemver(v) {
  const m = String(v).match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) throw new Error(`Invalid semver: ${v}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function semverCmp(a, b) {
  const aa = parseSemver(a);
  const bb = parseSemver(b);
  for (let i = 0; i < 3; i += 1) {
    if (aa[i] > bb[i]) return 1;
    if (aa[i] < bb[i]) return -1;
  }
  return 0;
}

const registry = JSON.parse(await readFile(registryPath, "utf8"));
const changelog = await readFile(changelogPath, "utf8");
const now = new Date();

if (!Array.isArray(registry.deprecations)) {
  throw new Error("schemas/deprecations.json: 'deprecations' must be an array");
}

for (const dep of registry.deprecations) {
  const required = [
    "id",
    "package",
    "kind",
    "deprecatedIn",
    "removeIn",
    "announceDate",
    "migration",
  ];
  for (const key of required) {
    if (!dep[key]) {
      throw new Error(`Deprecation '${dep.id ?? "unknown"}' missing field '${key}'`);
    }
  }
  if (semverCmp(dep.removeIn, dep.deprecatedIn) <= 0) {
    throw new Error(`Deprecation '${dep.id}' has invalid removeIn <= deprecatedIn`);
  }
  if (!changelog.includes(dep.id)) {
    throw new Error(`CHANGELOG.md missing deprecation entry id '${dep.id}'`);
  }
  if (dep.removeInDate) {
    const deadline = new Date(dep.removeInDate);
    if (Number.isNaN(deadline.getTime())) {
      throw new Error(`Deprecation '${dep.id}' has invalid removeInDate`);
    }
    if (deadline < now) {
      throw new Error(`Deprecation '${dep.id}' expired at ${dep.removeInDate}. Remove or extend with migration note.`);
    }
  }
}

process.stdout.write(`Deprecation check passed (${registry.deprecations.length} entries).\n`);
