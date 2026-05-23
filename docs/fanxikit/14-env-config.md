# 14. Env và Config

## `fanxikit.config.ts`

Config trung tâm cho app:
- `base`
- `trailingSlash`
- `adapter`
- `alias`
- `vite` integration overrides
- `kit` options mở rộng

## Env variables

Phân lớp:
- Public env: được expose client (tiền tố quy ước, ví dụ `PUBLIC_`).
- Private env: chỉ server truy cập.

Phân thời điểm:
- Static env: inject lúc build.
- Dynamic env: đọc lúc runtime server.

## Base path và trailing slash

- `base`: mount app dưới subpath.
- `trailingSlash`: `always | never | ignore`.

## Vite integration

fanxikit plugin merge config Vite, nhưng giữ escape hatch cho user custom.


