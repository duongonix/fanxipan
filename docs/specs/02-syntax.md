# 02 - Syntax Fanxipan (.fanxi)

## Component Format

Fanxipan `.fanxi` is a module function component format. It is not a `.svelte` section file and it is not a JSX clone.

```fanxi
import Child from "./Child.fanxi"

function App() {
  let count = $state(0)
  let props = { a: 1, b: $state(2) }
  let c = 3
  let d = 44

  return (
    <div>
      <Child {...props} {c} d={d} />
      <button onclick={() => count++}>{count}</button>
    </div>
  )
}

export default App
```

The syntax inside `return (...)` is Fanxi template syntax: it looks familiar to JavaScript authors, but it has compiler-owned blocks and directives that JSX does not have.

## Props

- Explicit prop: `<Child name={name} />`
- Shorthand prop: `<Child {name} />`
- Spread props: `<Child {...props} />`
- Function props: `function Child({ name }) { ... }`

## Control Flow

- `if/elif/else`:
`{#if}` `{:elif}` `{:else}` `{/if}`
- `for`:
`{#for item in items}`
`{#for item, index in items}`
`{#for item in items key item.id}`
`{:empty}`
`{/for}`
- `await`:
`{#await}` `{:then}` `{:catch}` `{/await}`
- `key`:
`{#key expr}` `{/key}`

## Reactivity API

- `$state(initial)`
- `$derived(expr)`
- `$effect(fn)`
- `$mount(fn)`
- `$unmount(fn)`
- `$nextTick()`
- `$global(initial)`
- `$inspect(value)`

## Directives

- `bind:value`, `bind:checked`, `bind:files`, `bind:this`, scroll/media/dimension bindings
- `class:active={expr}`
- `style:color={expr}`
- `use:action`, `transition:fade`, `in:fly`, `out:fade`, `animate:flip`
- Spread attrs/props: `<div {...attrs}>`, `<Component {...props}>`
- Event modifier: `|preventDefault`, `|stopPropagation`, `|once`

## Advanced Template

- Children projection: `<slot />`
- Snippet: `{#snippet row(item)}...{/snippet}`
- Render: `{@render row(user)}`
- Dynamic component: `<component this={Current} />`
- Special elements: `<head>`, `<window>`, `<document>`, `<body>`

## Styles

Canonical scoped component CSS uses a module style export:

```fanxi
function Button() {
  return (<button class="primary">Save</button>)
}

export const styles = `
.primary { color: red; }
`

export default Button
```

Legacy `<script>/<style>/markup` section files are compatibility-only and should not be used for new Fanxipan code.
