# 03 - Reactivity

## Mô hình

Compiler detect các primitive `$state/$derived/$effect` và tạo dependency graph:
`state -> derived -> effect -> DOM patch`.

## Quy tắc

1. `$state` là mutable source.
2. `$derived` là read-only computed.
3. Không cho mutate derived state.
4. `$effect` chạy khi dependency đổi.
5. `$mount/$unmount` gắn lifecycle setup/cleanup.

## Runtime tối thiểu

Runtime chỉ xử lý scheduling/subscription/cleanup, không làm diff virtual tree.

## Shared state and built-ins

- `$global(initial)` creates shared signal-like state for cross-component use.
- `provide(key, value)` and `inject(key, fallback)` are context primitives; child render contexts inherit from parents.
- Store APIs: `writable`, `readable`, `derived`, `readonly`.
- Reactive built-ins are available from `fanxipan/reactivity`: `FanxiMap`, `FanxiSet`, `FanxiURL`, `FanxiURLSearchParams`, `FanxiDate`, `createSubscriber`.
- `$inspect(value)` and `$inspect.trace()` are developer-only debug helpers and are intended to be tree-shaken/noop in production builds.
