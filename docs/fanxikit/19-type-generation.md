# 19. Type generation

## Mục tiêu

Tạo type tự động để DX tốt và giảm lỗi runtime.

## Phạm vi generate

- Route params types.
- Load data types (layout/page).
- Action data/result types.
- Endpoint event helpers types.

## Generated `$types`

Mỗi route tạo module `$types` để import trong `+page.ts`, `+layout.ts`, `+page.server.ts`, `+server.ts`.

Ví dụ:

```ts
import type { PageLoad, Actions } from './$types';
```

## tsconfig integration

fanxikit tự cập nhật `typeRoots`/`paths` cần thiết (hoặc phát sinh `.fanxikit/tsconfig.json` để app extends).

## Kiểm soát version

Type generator cần đồng bộ với route manifest schema version để tránh mismatch.


