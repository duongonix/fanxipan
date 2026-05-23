# fanxipan SPA Roadmap to 90% (Compiler-first Fanxi Template)

## Scope
Target is a SPA framework only.  
SSR/hydration is intentionally out-of-scope and will be handled later in fanxikit.

## Current Status
1. Phase 1: Completed (Correctness baseline)
2. Phase 2: Completed (DX + reliability baseline)
3. Next focus: SPA feature depth + renderer/runtime maturity

## Phase 3 (SPA Core Maturity)
Status: Completed on May 21, 2026.

### 1) Reactivity semantics hardening
- Scope: `$state/$derived/$effect` behavior parity and edge-case stability.
- Tasks:
1. Guarantee `$effect` cleanup ordering and re-run semantics in nested/component-heavy trees.
2. Add cycle detection diagnostics for derived dependency loops.
3. Lock update ordering for chained derived values.
- Done criteria:
1. Reactivity test suite covers nested/chained/cycle cases.
2. Compiler/runtime behavior is deterministic across rerenders.
 - Completion notes:
1. Added semantic diagnostics for derived dependency cycles.
2. Added analyzer tests for cycle detection and bind diagnostics hardening.

### 2) Component model completion
- Scope: props/children/event contract as production baseline.
- Tasks:
1. Stabilize props update lifecycle for parent-child updates.
2. Define and test children/slot composition behavior.
3. Add event forwarding/custom event contract.
- Done criteria:
1. Component integration tests pass for parent/child update scenarios.
2. No stale prop or event edge-case regressions in smoke apps.
 - Completion notes:
1. Added component children projection via `<slot />` codegen to render passed children.
2. Added `$emit(name, detail)` helper contract in compiler transform for custom event callbacks (`onX` props).
3. Added regression tests for slot projection and component wrapper contract.

### 3) Form binding completeness
- Scope: practical SPA forms.
- Tasks:
1. Complete `bind:value` behavior for text/number/textarea/select.
2. Add checkbox/radio binding semantics.
3. Add diagnostics for invalid bind targets and unsupported bind shapes.
- Done criteria:
1. Form-focused integration suite passes across all controls.
2. Binding docs include official patterns and caveats.
 - Completion notes:
1. Extended `bind` codegen for `checked` with `change` listener semantics.
2. Extended `bind:value` input handler for number/range coercion and multi-select arrays.
3. Added semantic diagnostic for unsupported bind directive names.

### 4) Renderer edge-case safety
- Scope: control flow and keyed list correctness.
- Tasks:
1. Stress test keyed `for` reorder/move/delete/insert paths.
2. Validate nested `if/for/component` teardown cleanup.
3. Eliminate listener/subscription leaks under rapid updates.
- Done criteria:
1. Renderer regression suite covers list/control-flow edge cases.
2. Leak checks pass in repeated mount/unmount loops.
 - Completion notes:
1. Added and passed compiler regression tests for slot, bind:checked, and if/for subscription behavior.
2. End-to-end smoke example builds passed after renderer/runtime updates.

## Phase 4 (SPA Product Readiness)

### 5) Router officialization
- Scope: first-class SPA routing story.
- Tasks:
1. Nested route support + params/query parsing.
2. Route guard and lazy-route loading conventions.
3. Link active-state behavior.
- Done criteria:
1. Router example app covers nested + guarded routes.
2. Router API documented as official.

### 6) Async/data-flow standards
- Scope: practical data loading in SPA.
- Tasks:
1. Official loading/error/retry pattern.
2. Cancellation strategy to avoid race conditions on fast navigation.
3. Data invalidation/refetch guidance.
- Done criteria:
1. Data-flow reference app demonstrates safe async patterns.
2. Docs include “official way” for request lifecycle handling.

### 7) Performance pass (SPA runtime)
- Scope: runtime and output efficiency.
- Tasks:
1. Reduce unnecessary subscriptions and updates.
2. Improve DOM patch path for heavy list updates.
3. Track bundle size trend per release.
- Done criteria:
1. Benchmarks show measurable improvement on hot paths.
2. Performance baseline report stored in repo docs.

## Phase 5 (Ecosystem and Adoption)

### 8) Official SPA architecture docs
- Scope: consistent project structure for teams.
- Tasks:
1. Publish recommended folder/module architecture.
2. Publish state/store conventions.
3. Publish component composition guidelines.
- Done criteria:
1. Docs support “build first app” without trial-and-error.
2. Starter template aligns with documented architecture.

### 9) Starter templates and examples
- Scope: onboarding speed.
- Tasks:
1. Production-ready SPA starter template.
2. Mid-size example app (routing + forms + async).
3. Migration notes for API changes during v0.x.
- Done criteria:
1. New users can bootstrap and ship a basic SPA quickly.
2. Example suite is used as CI smoke target.

### 10) Release discipline for v0.x
- Scope: trust and predictable upgrades.
- Tasks:
1. Keep API contract and compatibility matrix updated.
2. Enforce breaking-change PR checklist.
3. Publish changelog per release.
- Done criteria:
1. Every release has clear upgrade notes.
2. No silent breaking changes.

## Cross-Phase Definition of Done
1. Feature changes include tests (unit + integration where relevant).
2. CI passes on all supported OS targets.
3. Docs are updated in the same change where behavior changes.
4. No open P1 regressions before marking milestone complete.

## Suggested Milestones
1. Milestone A: Phase 3 complete (core SPA runtime/component confidence).
2. Milestone B: Phase 4 complete (router + async + perf baseline).
3. Milestone C: Phase 5 complete (ecosystem + release readiness near 90%).


