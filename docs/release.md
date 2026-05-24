# Fanxipan Release Guide

This guide is for releasing **Fanxipan only** to npm.

Public user API stays:

```ts
import fanxipan from "fanxipan";
import { Routes } from "fanxipan/router";
```

Internal packages are scoped (`@fanxipan/*`) and are not required for end users to import directly.

## 1) npm login (local)

```bash
npm login
npm whoami
```

## 2) Create npm token

1. Go to npm account settings -> Access Tokens.
2. Create an **Automation** token.
3. Copy token value once (cannot be viewed again).

## 3) Add GitHub Secret

In GitHub repo:

1. `Settings` -> `Secrets and variables` -> `Actions`.
2. `New repository secret`.
3. Name: `NPM_TOKEN`
4. Value: paste npm automation token.

## 4) Local preflight

```bash
pnpm install
pnpm run build:core
pnpm run test:fanxipan
pnpm run check:api-contract
pnpm run release:stable:dry
```

## 5) Stable release by tag (auto publish)

1. Bump versions (at least `packages/fanxipan/package.json`).
2. Update `CHANGELOG.md`.
3. Commit and push.
4. Create and push tag:

```bash
git tag fanxipan-v1.0.0
git push origin fanxipan-v1.0.0
```

Workflow `.github/workflows/release.yml` will run:

1. install
2. build core
3. fanxipan tests
4. release gate
5. npm publish stable

## 6) Canary release

Local dry run:

```bash
pnpm run release:canary:dry
```

Local live canary:

```bash
pnpm run release:canary
```

Or use `canary-publish.yml` workflow.

## 7) Rollback / deprecate bad npm release

If a version is bad:

1. Deprecate it:

```bash
npm deprecate fanxipan@1.0.0 "Deprecated due to regression, use 1.0.1+"
```

2. Publish fixed patch (for example `1.0.1`) and update release notes.

> Avoid unpublish for widely used versions unless absolutely necessary.

## 8) Notes about internal packages

Internal publishable packages include:

- `@fanxipan/runtime`
- `@fanxipan/router`
- `@fanxipan/compiler`
- `@fanxipan/node` (native bridge)

These are dependency layers for `fanxipan`.
Users should still use:

- `fanxipan`
- `fanxipan/router`
- `fanxipan/runtime`
- `fanxipan/reactivity`
- `fanxipan/store`
- `fanxipan/transitions`

## 9) Note about `@fanxipan/node` native package

`@fanxipan/node` currently ships the NAPI bridge package and relies on native artifacts.
If multi-platform optional dependency packaging is not fully completed in your release process,
document that limitation in release notes (especially for fresh installs on non-host platforms).

This does **not** change the public browser API for users:

```ts
import fanxipan from "fanxipan";
import { Routes } from "fanxipan/router";
```
