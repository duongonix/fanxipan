# Fanxipan Snippets Specification

## Overview
Fanxipan snippets provide reusable template fragments using compiler-first primitives:

- declaration: `{#snippet name(params)}...{/snippet}`
- render: `{@render name(args)}`

Snippets are lexical, reactive, and DOM-patching friendly (no component-wide rerender).

## Syntax
- `{#snippet item(user)} ... {/snippet}`
- `{@render item(user)}`
- `{@render props.footer?.()}` for optional snippets

## Parameters
Supported:
- multiple params
- default values
- object/array destructuring

Not supported in phase 1:
- rest parameter (`...args`) -> diagnostic: `Rest parameters are not supported in snippets.`

## Scope Rules
- Snippet visibility is lexical.
- Duplicate snippet names in the same lexical scope are invalid.
- Rendering a snippet outside scope yields: `Snippet "<name>" is not in scope.`

## Snippet As Props
Snippets are callable values and can be passed through props:

- `<Table header={header} row={row} />`
- render in child: `{@render props.row(item, index)}`

## Optional Snippets
- `{@render props.footer?.()}`
- If undefined, render no-op.
- If non-optional and value is not callable, runtime throws clear error.

## Typing
Public type is exported:

`import type { Snippet } from "fanxipan"`

`Snippet<Args>` is defined in runtime and re-exported through `fanxipan`.

## Programmatic Snippets
Runtime exports `createRawSnippet` and `isSnippet` as low-level APIs for custom snippet generation.

## Diagnostics
Implemented diagnostics include:
- `Missing snippet name.`
- `Invalid snippet parameters.`
- `Render expression must be a call expression.`
- `Render expression must call a snippet.`
- `Duplicate snippet name "<name>".`
- `Snippet "<name>" is not in scope.`

## Implementation Notes
- Parser builds `SnippetBlock` and `RenderBlock`.
- Analyzer tracks snippet declarations in lexical scope frames.
- Codegen emits snippet functions and render anchors.
- Reactive updates subscribe to render target/arg dependencies.
