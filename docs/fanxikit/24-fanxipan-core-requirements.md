# 24. Yêu cầu lên fanxipan core

## Mục tiêu

Xác định các primitive tối thiểu fanxipan core cần có để fanxikit hoạt động đúng, không đẩy logic fullstack vào core.

## Required primitives

- `hydrate(App, target, options)`.
- `renderToString(Component, props, context)`.
- Head collection primitive.
- CSS extraction primitive.
- Compiler metadata output.
- Component boundary metadata.
- Stable route component interface.
- Client mount/hydrate lifecycle hooks.
- Serialization-safe data passing contract.
- Compile target tách client/server.
- Sourcemap/diagnostics API.

## Kiến trúc bắt buộc giữ nguyên

- No virtual DOM.
- Direct DOM update/hydration compatibility.
- Compiler-first execution model.

## Điều fanxipan core không nên chứa

- File-based routing logic.
- Fullstack loaders/actions semantics.
- Session/auth framework.
- Adapter/deployment logic.

## Quy tắc governance

Mọi yêu cầu từ fanxikit sang fanxipan phải chứng minh:
1. Đây là primitive nền tảng.
2. Không thể đặt hợp lý ở layer fanxikit.
3. Không làm lệch triết lý kiến trúc fanxipan.


