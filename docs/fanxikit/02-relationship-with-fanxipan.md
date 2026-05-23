# 2. Quan hệ với fanxipan

## Hướng phụ thuộc

Bắt buộc:
- `fanxikit -> fanxipan`

Không được:
- `fanxipan -> fanxikit`

## fanxipan cung cấp

- Component compiler.
- Runtime reactivity.
- `hydrate` primitive.
- `render`/SSR primitive.
- Scoped CSS primitive.
- Compiler metadata.
- DOM update model (direct DOM, no vDOM).

## fanxikit cung cấp

- Routing convention và route resolution.
- Server rendering orchestration.
- Data loading contract (`load`).
- Actions/forms contract.
- Adapters/deployment abstraction.
- Build manifest app-level.
- App runtime (navigation, invalidation, scroll lifecycle).

## Quy tắc thay đổi fanxipan

Chỉ sửa fanxipan khi primitive đó là điều kiện bắt buộc để fanxikit hoạt động.

Ví dụ hợp lệ:
- Compiler mode cho SSR/hydration.
- Metadata boundary/component để hydrate chính xác.
- Hook trích xuất head/CSS.

Ví dụ không hợp lệ:
- Nhúng file-based routing vào fanxipan core.
- Nhúng session/auth/API router vào fanxipan core.


