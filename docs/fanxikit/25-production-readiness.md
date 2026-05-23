# FanxiKit Production Readiness

Tài liệu này ghi lại baseline hiện tại để FanxiKit tiến tới production-ready mà vẫn giữ dependency direction:

```text
FanxiKit -> Fanxipan
```

Fanxipan vẫn chịu trách nhiệm compiler/runtime UI. FanxiKit chịu trách nhiệm app framework: routing, SSR orchestration, load/action/API, hooks, cookies, env, adapters, build output và generated types.

## Đã Có Trong Runtime

- File-based route manifest cho `+page.fanxi`, `+layout.fanxi`, `+error.fanxi`, load/server/action/API route files.
- SSR request pipeline với route matching, load merge, action handling, endpoint handling, redirect/error/fail helpers.
- `hooks.server.ts` với `handle`, `handleFetch`, `handleError`.
- Request-local `event.locals`.
- Cookie API với `get`, `set`, `delete`, `serialize`, secure defaults và `Set-Cookie` propagation.
- Env snapshot helpers với public/private split và guard không expose private env lên client.
- Rendering modes `ssr`, `csr`, `prerender`.
- Prerender static pages và SPA fallback.
- Build output `.fanxikit/` gồm `client`, `server`, `prerendered`, `types`, `routes.json`, `manifest.json`.
- Adapter outputs cho Node, Static, Cloudflare, Vercel và Netlify package names `fanxi-adapter-*`.
- Streaming response primitive.
- Devtools event bridge foundation.
- Generated `$types` foundation.

## Example Chính

Example chính nằm ở:

```text
examples/fanxikit/
```

Nó cover:

- root layout và nested dashboard layout
- home/about/blog dynamic route
- `+page.ts`, `+page.server.ts`, `+layout.server.ts`
- form action với `fail()` và `redirect()`
- API route `GET`/`OPTIONS`
- `hooks.server.ts`
- cookies + locals
- prerender/build output
- `fanxi-adapter-node` / `fanxi-adapter-static` / `fanxi-adapter-cloudflare` scripts

## Lệnh Kiểm Tra

```bash
pnpm run build:fanxikit:phase5
pnpm run test:fanxikit
pnpm --filter @examples/fanxikit build
pnpm --filter @examples/fanxikit adapter:node
pnpm --filter @examples/fanxikit adapter:static
pnpm --filter @examples/fanxikit adapter:cloudflare
```

## Những Phần Cần Hardening Tiếp

- SSR component rendering hiện vẫn dựa vào compiler output extraction; Fanxipan nên có server render primitive chính thức để FanxiKit không cần đọc template từ compiled output.
- Hydration end-to-end cần fixture trình duyệt cho nested layouts, actions và navigation.
- Client navigation cần reuse layout/component boundary sâu hơn thay vì mới dừng ở runtime foundation.
- Cloudflare/Vercel/Netlify adapter hiện tạo entry/output metadata, cần bundling pipeline đầy đủ trước khi gọi là deploy-ready thật sự.
- Diagnostics cần code frame/line-column đầy đủ cho route/action/load/env errors.
