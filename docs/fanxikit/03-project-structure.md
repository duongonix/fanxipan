# 3. Cấu trúc dự án

## Cấu trúc app người dùng

```text
my-app/
  src/
    routes/
      +layout.fanxi
      +page.fanxi
      +error.fanxi
      +server.ts
      about/
        +page.fanxi
      blog/
        [id]/
          +page.fanxi
          +page.server.ts
    lib/
    app.html
    hooks.server.ts
    hooks.client.ts
  static/
  fanxikit.config.ts
  package.json
  tsconfig.json
```

## Ý nghĩa chính

- `src/routes`: toàn bộ routing tree theo convention.
- `+page.fanxi`: component cho page segment.
- `+layout.fanxi`: layout cho subtree.
- `+error.fanxi`: UI lỗi ở scope tương ứng.
- `+server.ts`: endpoint handlers theo route.
- `src/hooks.server.ts` / `src/hooks.client.ts`: hooks cấp ứng dụng.
- `src/app.html`: shell HTML template.
- `static/`: static assets nguyên bản.
- `fanxikit.config.ts`: config framework.

## Cấu trúc package nội bộ fanxikit

```text
packages/
  fanxikit/
  fanxikit-vite/
  adapter-node/          # package name: fanxi-adapter-node
  adapter-static/        # package name: fanxi-adapter-static
  adapter-cloudflare/    # package name: fanxi-adapter-cloudflare
```

- `fanxikit`: runtime + compiler integration + core app framework.
- `fanxikit-vite`: plugin/dev integration cho Vite.
- `adapter-*`: deployment target cụ thể.



