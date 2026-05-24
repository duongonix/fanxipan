# fanxipan

fanxipan là frontend framework compiler-first với Rust compiler + tiny TypeScript runtime.

## Trụ cột

- Compiler-first: parse/analyze/generate ở compile-time.
- Fine-grained reactivity: `$state`, `$derived`, `$effect`, `$global`.
- Direct DOM updates, không virtual DOM.
- Runtime nhỏ cho mount/scheduler/context/store/transition helpers.
- SPA-first, với hydration foundation để FanxiKit dùng sau.

## Monorepo

- Rust workspace trong `crates/*`.
- PNPM workspace trong `packages/*`, `examples/*` và `example`.
- Specs chi tiết trong `docs/specs/*`.

## Lệnh cơ bản

- Rust check: `cargo check`
- JS build: `pnpm -r build`
- Core build (kèm native bridge): `pnpm run build:core`
- Build NAPI bridge riêng: `pnpm --filter @fanxipan/node build`
- JS typecheck: `pnpm -r typecheck`
- API contract check: `pnpm run check:api-contract`
- Deprecation policy check: `pnpm run check:deprecations`
- Full example: `pnpm --filter @examples/full-fanxipan build`

## Đuôi file component

fanxipan component dùng đuôi `.fanxi`. File `.fanxi` là module function component: import ở đầu file, khai báo state trong function, trả về Fanxi template bằng `return (...)`, rồi `export default`.

```fanxi
function Counter() {
  let count = $state(0)
  let doubled = $derived(count * 2)

  return (
    <button onclick={() => count++}>{count} / {doubled}</button>
  )
}

export default Counter
```



