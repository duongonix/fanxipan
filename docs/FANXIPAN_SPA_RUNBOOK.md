# Fanxipan SPA Operations Runbook

## Canonical Commands

- Dev: `pnpm run dev:spa`
- Full verification gate: `pnpm run verify:fanxipan`
- Release metadata gate: `pnpm run release:gate`
- Canary dry run publish: `pnpm run release:canary:dry`
- Canary live publish: `pnpm run release:canary`
- Stable dry run publish: `pnpm run release:stable:dry`
- Stable live publish: `pnpm run release:stable`

## Pre-Release Checklist (Fanxipan Core)

1. `pnpm run doctor:core`
2. `pnpm run build:core`
3. `pnpm run test:fanxipan`
4. `pnpm run bench:runtime`
5. `pnpm run soak:runtime`
6. `pnpm run build:examples`
7. `pnpm run test:e2e:examples`
8. `pnpm run check:api-contract`
9. `pnpm run check:deprecations`

## Canary Release

1. Ensure `NPM_TOKEN` is configured in repository secrets.
2. Run workflow `Canary Publish` with `dry_run=true` first.
3. Validate output package list/version.
4. Re-run with `dry_run=false` to publish with npm provenance.

## Stable Release (All OS)

1. Bump versions + update `CHANGELOG.md`.
2. Create tag format: `fanxipan-vX.Y.Z`.
3. Ensure GitHub secret `NPM_TOKEN` is set.
4. Run workflow `Stable Publish` with:
   - `release_tag=fanxipan-vX.Y.Z`
   - `dry_run=true`
5. Validate dry-run package list and native artifacts build for Linux/Windows/macOS.
6. Re-run workflow with `dry_run=false`.
7. Confirm:
   - npm packages published under `latest`
   - GitHub release created with native `.node` artifacts attached.

## Detailed Release Click-By-Click

1. Open GitHub repository -> `Actions` tab.
2. Select `Stable Publish`.
3. Click `Run workflow`.
4. Fill:
   - `release_tag`: e.g. `fanxipan-v1.0.1`
   - `dry_run`: `true`
5. Click `Run workflow`, wait all jobs green.
6. Open logs:
   - `Release Gate` must pass
   - `Verify SPA` must pass
   - `Publish Stable (Dry Run)` must show package tarball metadata without errors
   - `Native Artifacts` jobs must upload `.node` files for all 3 OS
7. Re-run workflow with same tag, `dry_run=false`.
8. Verify npm:
   - `npm view fanxipan version`
   - `npm view vite-plugin-fanxipan version`
9. Verify GitHub Release:
   - release tag exists
   - native `.node` assets attached

## Rollback Checklist

1. Stop rollout and freeze new deployments.
2. Re-point deploy artifact to the previous stable tag.
3. Re-run `pnpm run verify:fanxipan` on rollback tag.
4. Confirm key user flows:
   - Todo add/update/filter in `example`
   - Basic example interaction
   - Router example route transitions
5. Open incident note:
   - Failure symptom
   - First bad tag
   - Root cause hypothesis
   - Mitigation/next patch owner

## Common Local Issues

### 1) Stale compiler/runtime output

Symptoms:
- State changes but UI does not update as expected.
- Behavior differs between examples.

Fix:
1. `pnpm run doctor:core`
2. `pnpm run build:core`
3. Restart dev server.

### 2) Native `.node` file lock on Windows

Symptoms:
- EPERM unlink/overwrite during `fanxipan-node` build.

Fix:
1. Stop all running dev/test node processes.
2. Retry `pnpm run build:core`.

### 3) E2E preview port conflicts

Symptoms:
- E2E script cannot start preview on strict ports.

Fix:
1. Stop local preview/dev servers using ports 4173-4176.
2. Re-run `pnpm run test:e2e:examples`.
