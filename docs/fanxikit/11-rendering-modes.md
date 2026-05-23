# 11. Rendering modes

## Mục tiêu

Cho phép chọn chiến lược render theo app hoặc theo route.

## Flags dự kiến

```ts
export const ssr = false;
export const csr = true;
export const prerender = true;
```

## Modes

- SSR enabled: render server + hydrate client.
- CSR only: không render server cho route đó.
- Prerender: build-time HTML generation.
- SPA fallback: route động không prerender sẽ fallback shell.

## Per-route config

`ssr/csr/prerender` có thể khai báo ở `+page.ts`/`+layout.ts` (hoặc server variant theo rule chốt sau), kế thừa từ layout cha nếu không override.
