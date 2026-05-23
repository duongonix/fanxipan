# Fanxipan Production Readiness Checklist

Last updated: 2026-05-23

## Overall Status

- Current recommendation: **MVP/Internal production**.
- Not yet recommended as fully hardened public production platform for broad workloads.

## Checklist

### 1) Compiler/Runtime Correctness

- [x] Unit tests for compiler/analyzer/runtime exist and run in CI.
- [x] Semantic diagnostics cover unknown identifiers, invalid key/bind, mutate-derived, cycles.
- [x] Regression added for multiline `$state/$derived` dependency capture.
- [x] Regression added for `#for` expression callback params scope (e.g. `filter((todo) => ...)`).
- [x] Regression added for unique block renderer naming (`renderIf`/`renderFor` collision class).
- [ ] Add fuzz/property tests for template parse + codegen edge cases.
- [ ] Add snapshot coverage for deeply nested blocks + dynamic components + snippets combined.

### 2) Build & CI Reliability

- [x] CI matrix across Linux/Windows/macOS for Rust + JS.
- [x] Smoke examples and browser E2E examples in CI.
- [x] API contract and deprecation checks in CI.
- [x] Native bridge artifact build workflow exists (`release-native.yml`).
- [x] Add release gates (version/tag validation, changelog gate).
- [x] Add rollback playbook (`docs/FANXIPAN_SPA_RUNBOOK.md`).
- [x] Add automated canary publish workflow (`.github/workflows/canary-publish.yml`).
- [x] Enable provenance signing path for live publish (`npm publish --provenance` in canary workflow).

### 3) Developer Workflow Stability

- [x] `build:core` pipeline defined and used by examples.
- [x] Example dev script can be aligned to force core rebuild before run.
- [x] Add canonical SPA dev command (`pnpm run dev:spa`).
- [x] Add doctor script to detect stale `dist`/native bridge mismatch.

### 4) Performance & Resource Safety

- [x] Basic E2E and smoke checks exist.
- [x] Add baseline runtime benchmark gate (`pnpm run bench:runtime`).
- [x] Add runtime soak/leak regression gate (`pnpm run soak:runtime`).
- [ ] Track bundle size trend per package in CI.

### 5) SSR/Hydration & Framework Layer (FanxiKit)

- [x] SSR pipeline, routing, load/actions/hooks/cookies/env/adapters foundation exists.
- [x] Production-readiness notes for FanxiKit documented.
- [ ] Expand hydration E2E for nested layouts + form actions + navigation transitions.
- [ ] Harden adapters (Cloudflare/Vercel/Netlify) from metadata output to full deploy pipeline.
- [ ] Improve SSR/component rendering primitive contract between Fanxipan core and FanxiKit.

### 6) Versioning, Compatibility, and Releases

- [x] Changelog and compatibility docs exist.
- [x] API contract baseline document exists.
- [ ] Define and enforce semver policy at package boundaries.
- [ ] Publish upgrade guides for known breaking classes (reactivity/codegen/runtime behavior).
- [ ] Formalize release checklist (preflight tests, artifact verification, post-release monitoring).

### 7) Observability & Debuggability

- [x] Compiler diagnostics include structured metadata (code, line, column, suggestion).
- [ ] Add runtime debug mode for dependency subscriptions and invalidation tracing.
- [ ] Standardize production error codes across compiler/runtime/fanxikit layers.
- [ ] Add troubleshooting docs for common local issues (native `.node` lock, stale dist, HMR drift).

## Suggested 1-2 Week Hardening Plan

1. Stabilize release flow
   - Add release gate workflow (tag + changelog + contract check + artifact verify).
2. Prevent stale-core regressions
   - Canonicalize example dev command and add mismatch doctor script.
3. Add performance/leak coverage
   - Minimum benchmark + 1 long-run listener/subscription leak test.
4. Expand hydration E2E (FanxiKit)
   - Nested layout + action + route navigation scenarios.
5. Publish operator docs
   - “Known issues + runbook” and “upgrade guide” for internal adopters.
