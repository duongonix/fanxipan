# 16 - Roadmap Status

## Fanxipan core

Implemented in core:

- `.fanxi` product format as module function components returning Fanxi template.
- Rust parser/template AST/analyzer/codegen pipeline.
- Direct DOM generation, text interpolation, attributes, events, modifiers, if/elif/else, for/empty and keyed for.
- Components, props, spread props, spread attributes, `<slot />`, snippets/render blocks and dynamic components.
- Await/key blocks with cleanup boundaries.
- Binding for value, checked, files, group, this, scroll, dimensions and media state.
- class/style/use/transition/in/out/animate directives.
- Head/window/document/body special elements.
- Scoped CSS through `export const styles = \`...\``, `:global(...)`, simple unused selector diagnostics and Vite style HMR injection.
- Runtime stores, context, lifecycle, inspect, reactive Map/Set/URL/URLSearchParams/Date.
- Hydration/custom-element APIs have foundation docs/contracts but are intentionally not full SSR in Fanxipan core.

## Tooling

- `vite-plugin-fanxipan` transforms `.fanxi`, forwards diagnostics and injects scoped CSS.
- `create-fanxipan` supports `basic`, `router`, `todo` and `typescript` templates.
- Rust `fanxipan` CLI provides `dev`, `build`, `preview` and `check`.
- Playground and devtools packages expose foundations for REPL/live preview and component/state/effect tracing.

## Boundaries

Fanxipan remains SPA-first and compiler-first. FanxiKit owns fullstack SSR, adapters, file routing conventions and future full hydration behavior.


