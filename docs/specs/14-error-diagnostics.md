# 14 - Error & Diagnostics

## Mục tiêu DX

Lỗi phải rõ ràng, chỉ đúng vị trí, có gợi ý sửa.

## Format

- Message chính.
- Error code ổn định (`fanxipan_*` hoặc `fanxipan_DEPRECATED[...]`).
- File + line/column.
- Code frame.
- Suggestion cụ thể.

## Error Code Catalog (baseline)

- `fanxipan_PARSE_MISSING_BLOCK_CLOSE`: thiếu `{/if}` / `{/for}` / `{/await}`.
- `fanxipan_PARSE_UNEXPECTED_ELIF`: dùng `{:elif}` sai ngữ cảnh.
- `fanxipan_PARSE_TEMPLATE`: lỗi parse template tổng quát từ parser Rust.
- `fanxipan_SEM_INVALID_KEY`: key expression không hợp lệ.
- `fanxipan_SEM_MUTATE_DERIVED`: mutate `$derived`.
- `fanxipan_SEM_UNKNOWN_IDENTIFIER`: identifier không tồn tại trong scope.
- `fanxipan_SEM_INVALID_BIND_TARGET`: `bind:*` target không assignable.
- `fanxipan_SEM_UNSUPPORTED_BIND`: bind directive chưa hỗ trợ.
- `fanxipan_SEM_DERIVED_CYCLE`: chu trình phụ thuộc derived.
- `fanxipan_SEM_IMPURE_TEMPLATE_EXPR`: expression trong template có side-effect.
- `fanxipan_DEPRECATED[<id>]`: API/syntax đã deprecated theo registry `schemas/deprecations.json`.

## Ví dụ lỗi chuẩn

- Missing `{/for}`
- Unexpected `{:elif}`
- Invalid key expression
- Cannot mutate derived state


