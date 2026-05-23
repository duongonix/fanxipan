# 15. Adapters và Deployment

## Mục tiêu

Tách core framework khỏi runtime target bằng adapter contract.

## Adapters giai đoạn đầu

- `fanxi-adapter-node`
- `fanxi-adapter-static`
- `fanxi-adapter-cloudflare`

Kế hoạch sau:
- `fanxi-adapter-vercel`
- `fanxi-adapter-netlify`

## Adapter interface

```ts
interface Adapter {
  name: string;
  adapt(builder: Builder): Promise<void>;
}
```

## Builder API (dự kiến)

- `routes`
- `assets`
- `server entry`
- `client entry`
- `prerendered pages`
- `manifest`

Có thể mở rộng thêm helper `writeClient`, `writeServer`, `copyStatic`, `generateEnvModule`.

## Triển khai

- Core build sinh output trung gian chuẩn.
- Adapter chuyển output đó thành artifact deploy target-specific.
