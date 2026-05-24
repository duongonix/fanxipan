# Fanxipan Overview

## 1. What Fanxipan Is

Fanxipan is a compiler-first frontend framework for building modern web applications with:

- Rust-powered compilation pipeline
- TypeScript runtime
- fine-grained reactivity
- direct DOM updates (no virtual DOM)
- explicit, predictable component contract

Fanxipan components are authored as `.fanxi` files and compiled into JavaScript modules optimized for runtime performance and fast updates.

## 2. Design Principles

Fanxipan is built around these principles:

- Compiler over runtime complexity: move template analysis and optimizations to build time.
- Fine-grained updates: patch only affected DOM/text nodes where possible.
- Explicit reactivity: `$state`, `$derived`, `$effect` remain simple and inspectable.
- Framework ergonomics: stable public imports and Vite-first developer experience.

## 3. Public API Contract

The user-facing package remains:

- `fanxipan`

Supported import style:

```ts
import fanxipan from "fanxipan";
import { Routes } from "fanxipan/router";
```

Subpath exports currently include:

- `fanxipan`
- `fanxipan/router`
- `fanxipan/runtime`
- `fanxipan/reactivity`
- `fanxipan/store`
- `fanxipan/transitions`

## 4. Monorepo Architecture

Fanxipan repository is organized as a hybrid Rust + TypeScript monorepo.

### 4.1 Rust Core (`crates/`)

Main core crates:

- `fanxipan_ast`
- `fanxipan_template`
- `fanxipan_parser`
- `fanxipan_analyzer`
- `fanxipan_codegen`
- `fanxipan_compiler`
- `fanxipan_css`
- `fanxipan_diagnostics`
- `fanxipan_hmr`
- `fanxipan_ssr`
- `fanxipan_node` (native bridge)

Responsibilities:

- Parse `.fanxi` source into AST
- Analyze reactivity + scope + template semantics
- Generate DOM-oriented JS output
- Produce diagnostics with source locations
- Support native bridge entrypoints for compiler integration

### 4.2 TypeScript Packages (`packages/`)

Core packages:

- `fanxipan` (public framework package)
- `@fanxipan/runtime`
- `@fanxipan/router`
- `@fanxipan/compiler`
- `@fanxipan/node`
- `vite-plugin-fanxipan`
- `create-fanxipan`

Additional ecosystem packages exist (fanxikit/adapters/fanxicon/fanxiui) but Fanxipan release work focuses on core framework packages above.

## 5. Reactivity and Runtime Model

Runtime provides:

- `$state`, `$derived`, `$effect`
- dependency subscriptions (`subscribeExpr` flow)
- render context and cleanup lifecycle
- DOM helpers for scoped CSS and effects

Target behavior:

- no full component rerender by default
- focused DOM updates driven by reactive deps
- deterministic cleanup on unmount/dispose paths

## 6. Template Features

Fanxipan template syntax includes:

- `{#if} {:elif} {:else} {/if}`
- `{#for item, index in items key item.id} {:empty} {/for}`
- directives such as `on*`, `bind:*`, `class:*`, `style:*`, `use:*`, transition directives
- component children projection

### 6.1 Snippet/Render System (Current)

Implemented snippet primitives:

- declaration: `{#snippet name(params)}...{/snippet}`
- render: `{@render name(args)}`
- optional render form support in parser/codegen path for `?.()`
- lexical scope checks in analyzer
- duplicate snippet name checks in same scope
- parser diagnostics for invalid snippet/render forms

Type support:

- `Snippet` type exported through runtime and `fanxipan`
- `createRawSnippet` and `isSnippet` runtime helpers available

Reference spec:

- `docs/specs/snippets.md`

## 7. Tooling and Build

Primary toolchain:

- `pnpm` workspaces
- `vite` + `vite-plugin-fanxipan`
- `vitest`
- `tsc`
- Rust toolchain for compiler crates

Common root scripts:

- `pnpm run build:core`
- `pnpm run test:fanxipan`
- `pnpm run check:api-contract`
- `pnpm run test:smoke:examples`
- `pnpm run release:gate`
- `pnpm run release:stable:dry`
- `pnpm run release:stable`

## 8. Packaging and Publishing Strategy

NPM packages are split into:

- public entry package: `fanxipan`
- internal scoped dependencies: `@fanxipan/runtime`, `@fanxipan/router`, `@fanxipan/compiler`, `@fanxipan/node`
- tooling packages: `vite-plugin-fanxipan`, `create-fanxipan`

Public usage remains through `fanxipan` and its subpath exports (for example `fanxipan/router`), not `@fanxipan/router` for end users.

## 9. CI/CD and Release

GitHub workflows in `.github/workflows` cover:

- CI validation
- release gate validation
- native release build
- canary/stable publish flows
- tag-triggered release (`fanxipan-v*.*.*`) through `release.yml`

Release scripts include:

- `scripts/check-release-gate.mjs`
- `scripts/publish-canary.mjs`
- `scripts/publish-stable.mjs`

## 10. Examples and Developer Experience

Repository examples include:

- basic
- todo
- router
- playground
- ssr
- full-fanxipan

Snippet examples added under:

- `examples/snippets/basic`
- `examples/snippets/table`
- `examples/snippets/children`
- `examples/snippets/recursive`
- `examples/snippets/optional`

## 11. Current Maturity Notes

Fanxipan core is strongly functional for SPA workflows with:

- compiler + runtime + router integration
- Vite plugin path
- package/release automation
- smoke/build validation paths

Ongoing hardening areas typically include:

- deeper snippet lifecycle optimization in complex nested keyed scenarios
- broader cross-platform native packaging validation
- documentation expansion and API conformance checks over time

## 12. Recommended Validation Before Release

Use this baseline:

```bash
pnpm install
pnpm run build:core
pnpm run test:fanxipan
pnpm run check:api-contract
pnpm run test:smoke:examples
pnpm run release:stable:dry
```

Then release by tag if gate is clean.
