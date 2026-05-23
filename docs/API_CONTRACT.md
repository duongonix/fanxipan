# fanxipan API Contract (Phase 2 Freeze)

Effective date: May 21, 2026.

## Scope
This contract freezes expected behavior for the current v0.x line so downstream users can rely on stable semantics while fanxipan continues to evolve.

## Reactive Helpers
1. `$state(initial)`:
- Declares mutable reactive state.
- Mutations to the state value trigger dependency updates.

2. `$derived(expr)`:
- Declares computed reactive value derived from state/derived dependencies.
- Direct mutation of a derived binding is invalid.

3. `$effect(fn)`:
- Registers side-effect function.
- Runs initially after component setup.
- Re-runs when tracked dependencies change.
- Cleanup function returned from `fn` runs before the next re-run and on teardown.

## Component Props
1. Components receive props via wrapper-managed `props`.
2. Supported parameter styles:
- `function Comp(props) { ... }`
- `function Comp({ name, click }) { ... }`
3. Destructured parameters are rebound from current props when component instance is invoked.

## Template Reactivity
1. Expression updates subscribe by dependency graph, not by raw expression string.
2. `if/for` block render functions subscribe to their controlling dependencies.

## Event and Notify Semantics
1. Event handlers that mutate state notify relevant dependencies (`ctx.notify/ctx.notifyMany`).
2. Runtime should not rely on broad `flushAll` fallback for standard component prop callbacks.

## Diagnostics Contract
Compiler diagnostics should include:
1. `filename`
2. `line`
3. `column`
4. Human-readable `message`
5. Actionable `suggestion` when possible

## Deprecations (v0.x)
1. `$dericved` is treated as invalid spelling and should be replaced with `$derived`.
2. Future breaking changes in helper semantics must include migration notes.



