# Fanxipan Snapshot (2026-05-24)

## Repository State

Fanxipan is operating as a Rust + TypeScript monorepo with active framework, tooling, and release automation.

Top-level status:

- Core framework packages available: `fanxipan`, `@fanxipan/runtime`, `@fanxipan/router`, `@fanxipan/compiler`, `@fanxipan/node`
- Tooling packages available: `vite-plugin-fanxipan`, `create-fanxipan`
- Rust compiler pipeline integrated through `crates/*`
- CI/release workflows present under `.github/workflows`

## Public API and Package Contract

Public import contract remains:

- `import fanxipan from "fanxipan"`
- `import { Routes } from "fanxipan/router"`

Subpath exports are maintained through `fanxipan` package:

- `.`
- `./router`
- `./runtime`
- `./reactivity`
- `./store`
- `./transitions`

## Core Capabilities Completed

- Compiler-first `.fanxi` pipeline (parse -> analyze -> codegen)
- Fine-grained runtime reactivity with `$state`, `$derived`, `$effect`
- Template control flow:
  - `if/elif/else`
  - `for` + keyed + empty branch
  - `await`
  - `key`
- Directive coverage for attrs/events/bind/class/style and transition-style directives
- Component mounting, children projection, and render context cleanup
- HMR-related runtime/compiler hooks in place

## Snippet/Render Progress

Completed:

- Added/updated snippet spec: `docs/specs/snippets.md`
- Parser supports snippet/render syntax and improved diagnostics
- Analyzer now enforces lexical snippet scope
- Duplicate snippet name detection in same lexical scope
- Out-of-scope snippet render diagnostics
- Runtime/public type exports:
  - `Snippet`
  - `createRawSnippet`
  - `isSnippet`
- Added snippet examples:
  - `examples/snippets/basic`
  - `examples/snippets/table`
  - `examples/snippets/children`
  - `examples/snippets/recursive`
  - `examples/snippets/optional`

Current caveat:

- Advanced snippet lifecycle optimization for all complex keyed/nested branches is still an optimization track, not a finished final-state claim.

## fanxipan/store Progress

Store API aligned with core Svelte store contract patterns while preserving Fanxipan style:

- `writable`
- `readable`
- `derived`
- `readonly`
- `get`

Exports are available via:

- `fanxipan/store`
- `@fanxipan/runtime/store`

## Release and Automation

Release scripts:

- `scripts/check-release-gate.mjs`
- `scripts/publish-canary.mjs`
- `scripts/publish-stable.mjs`

Workflow coverage includes:

- CI checks
- release gate
- native release flow
- canary and stable publish workflows
- tag-triggered release flow (`fanxipan-v*.*.*`) via `release.yml`

## Validation Status (Latest Local Passes)

Passing checks observed in current work cycle:

- `pnpm run build:core`
- `pnpm run check:api-contract`
- `pnpm run test:smoke:examples`

Note:

- `pnpm run test:fanxipan` may fail in some local environments due to node_modules/vite resolution issues unrelated to recent snippet logic changes; Rust/compiler suites for modified areas are passing.

## Documentation Updates in This Snapshot

- Added: `docs/fanxipan/overview.md`
- Updated: `docs/SNAPSHOT.md`
- Added/maintained: `docs/specs/snippets.md`
