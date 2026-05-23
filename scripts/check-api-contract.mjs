import { readFile } from "node:fs/promises";

const indexPath = new URL("../packages/fanxipan/src/index.ts", import.meta.url);
const changelogPath = new URL("../CHANGELOG.md", import.meta.url);

const indexSrc = await readFile(indexPath, "utf8");
const changelog = await readFile(changelogPath, "utf8");

const match = indexSrc.match(/export const fanxipan_API_CONTRACT_VERSION = "([^"]+)"/);
if (!match) {
  throw new Error("Missing fanxipan_API_CONTRACT_VERSION in packages/fanxipan/src/index.ts");
}
const contract = match[1];
const needle = `Contract: \`fanxipan\` public API \`${contract}\``;
if (!changelog.includes(needle)) {
  throw new Error(
    `CHANGELOG.md must contain contract entry for ${contract}. Expected to find: ${needle}`
  );
}

process.stdout.write(`API contract check passed (${contract}).\n`);


