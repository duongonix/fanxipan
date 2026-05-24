# Fanxipan Release Checklist

This checklist is for releasing Fanxipan packages through the repository release flow.

## 1. Preconditions

- You have publish permission on npm for:
  - `fanxipan`
  - `@fanxipan/runtime`
  - `@fanxipan/router`
  - `@fanxipan/compiler`
  - `@fanxipan/node`
  - `vite-plugin-fanxipan`
  - `create-fanxipan`
- Repository secrets are configured (if using token-based publish):
  - `NPM_TOKEN`
- You are on the correct branch with intended release commits.

## 2. Version and Tag Rules

- Release tag format must be:
  - `fanxipan-vX.Y.Z`
- Ensure target package versions are aligned before tagging.
- Never reuse an already published version number.

## 3. Local Validation (Required)

Run from repository root:

```bash
pnpm install
pnpm run build:core
pnpm run test:fanxipan
pnpm run check:api-contract
pnpm run test:smoke:examples
pnpm run release:gate
pnpm run release:stable:dry
```

If any command fails, stop and fix before releasing.

## 4. Verify What Will Be Published

- Confirm publish order and versions printed by dry-run.
- Confirm no private/internal-only packages are being published unexpectedly.
- Confirm `fanxipan` package exports and files are correct.

Optional package inspection:

```bash
cd packages/fanxipan
npm pack
```

## 5. Create Release Commit

Typical release prep steps:

```bash
git add -A
git commit -m "chore(release): prepare X.Y.Z"
git push origin main
```

## 6. Create and Push Tag

```bash
git tag fanxipan-vX.Y.Z
git push origin fanxipan-vX.Y.Z
```

This should trigger tag-based release workflow (`release.yml`).

## 7. Monitor GitHub Actions

In Actions, verify the release job stages:

- checkout
- setup node/pnpm
- install
- build core
- tests
- release gate
- stable publish

If workflow fails, fix issue and create a new version/tag (do not republish same version).

## 8. Post-Release Verification

Check versions and dist-tags:

```bash
npm view fanxipan versions --json
npm dist-tag ls fanxipan
npm view @fanxipan/runtime versions --json
npm dist-tag ls @fanxipan/runtime
```

Verify consumer install:

```bash
pnpm create fanxipan fanxipan-web
cd fanxipan-web
pnpm install
pnpm dev
```

And verify imports:

```ts
import fanxipan from "fanxipan";
import { Routes } from "fanxipan/router";
```

## 9. Rollback / Mitigation

If release is broken:

1. Publish fixed version `X.Y.(Z+1)` as soon as possible.
2. Deprecate bad version:

```bash
npm deprecate fanxipan@X.Y.Z "Deprecated due to release issue. Use X.Y.Z+1."
```

Apply same to affected scoped/tooling packages as needed.

## 10. Common Failure Cases

- Version already exists on npm:
  - Bump versions and release a new tag.
- Scope/package permission errors (403/404):
  - Verify npm ownership and token scopes.
- Provenance/repository metadata mismatch:
  - Ensure package `repository.url` matches actual GitHub repository URL.
- Native package load mismatch:
  - Verify `@fanxipan/node` artifact names and loader mapping before release.

## 11. Recommended Release Discipline

- Prefer small, frequent releases over large risky batches.
- Always run dry-run first.
- Keep changelog/release notes in sync with actual shipped behavior.
- Treat `release:gate` as mandatory, not optional.
