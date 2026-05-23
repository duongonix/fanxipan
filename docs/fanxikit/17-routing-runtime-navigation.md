# 17. Routing runtime và Navigation

## Client navigation

- Intercept click trên link nội bộ.
- Resolve route manifest phía client.
- Chạy load cần thiết, cập nhật UI không reload full page.

## Link interception

Không intercept khi:
- external URL
- `target="_blank"`
- modified click (cmd/ctrl/shift)
- `download`

## Preloading

- Preload code theo hover/viewport/intent.
- Preload data theo policy route.

## Invalidation

- `invalidate(key)` và `invalidateAll()`.
- Rerun load theo dependency keys đã khai báo qua `depends()`.

## Route transitions

- Lifecycle bắt đầu/kết thúc điều hướng.
- Hỗ trợ future integration cho transition UI.

## Scroll restoration

- Back/forward: restore vị trí cũ.
- Navigate mới: scroll top mặc định, cho phép override.

## History/route state

- Dùng `history.state` lưu trạng thái navigation.
- Route state expose cho hooks/runtime APIs.

## Navigation lifecycle

- `beforeNavigate`
- `onNavigate` (tương lai)
- `afterNavigate`
