# 5. Layouts

## Root layout

`src/routes/+layout.fanxi` là layout gốc, bao toàn bộ ứng dụng.

## Nested layout

Mỗi thư mục con có thể thêm `+layout.fanxi` để wrap subtree.

Ví dụ:

```text
src/routes/
  +layout.fanxi
  +page.fanxi
  dashboard/
    +layout.fanxi
    settings/
      +page.fanxi
```

`/dashboard/settings` dùng cả root layout và dashboard layout.

## Layout inheritance

- Layout cha truyền `data` và slots xuống con.
- Layout con có thể gọi `parent()` để lấy dữ liệu đã resolve từ cha.

## Layout reset

Cho phép reset chuỗi layout bằng convention riêng (đề xuất `+layout@.fanxi` hoặc config marker), dùng cho vùng cần shell tách biệt (ví dụ auth pages). Chi tiết syntax chốt ở phase implementation.

## Route groups và layout

Layout trong group `(marketing)` vẫn áp dụng cho subtree nhưng không đổi URL.

## Data merge

- Layout data merge từ gốc tới lá.
- Page data merge sau cùng, có quyền override key trùng tên.

## Layout persistence client-side

Trong điều hướng client, các layout không đổi segment sẽ được giữ lại để tối ưu state/UI continuity.

