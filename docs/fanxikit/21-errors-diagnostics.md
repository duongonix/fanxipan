# 21. Errors và Diagnostics

## Nhóm lỗi cần bắt

- Route conflict.
- Invalid file convention.
- Missing page cho route expected.
- Invalid `load` export.
- Invalid `actions` export.
- Serialization error.
- Hydration mismatch.
- Adapter build/deploy error.

## Trải nghiệm diagnostics

- Thông báo rõ file + export + route liên quan.
- Code frame tại vị trí lỗi.
- Actionable suggestion (cách sửa cụ thể).
- Phân biệt lỗi compile-time, build-time, runtime.

## Error boundary runtime

- Nearest `+error.fanxi` nhận lỗi có thể recover.
- Lỗi không recover fallback về global error page/500 response.

