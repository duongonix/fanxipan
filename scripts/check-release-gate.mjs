import { readFileSync } from "node:fs";

const tag = process.env.GITHUB_REF_NAME || process.env.RELEASE_TAG || "";
if (!tag) {
  console.log("[release-gate] No tag provided. Skipping tagged checks.");
  process.exit(0);
}

const match = /^fanxipan-v(\d+\.\d+\.\d+)$/.exec(tag);
if (!match) {
  console.error(`[release-gate] Invalid tag format "${tag}". Expected fanxipan-vX.Y.Z`);
  process.exit(1);
}

const version = match[1];
const changelog = readFileSync("CHANGELOG.md", "utf8");
if (!changelog.includes(`## ${version}`) && !changelog.includes("## Unreleased")) {
  console.error(
    `[release-gate] CHANGELOG.md missing section for ${version} (or Unreleased staging section).`,
  );
  process.exit(1);
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
if (pkg.version !== version) {
  console.error(
    `[release-gate] Root package version ${pkg.version} does not match tag ${version}.`,
  );
  process.exit(1);
}

console.log(`[release-gate] Tag ${tag} validated.`);
