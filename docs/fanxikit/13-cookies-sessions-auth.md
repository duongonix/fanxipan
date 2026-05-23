# 13. Cookies, Sessions, Auth foundation

## Cookies API

`event.cookies` cung cấp:
- `get(name)`
- `set(name, value, options)`
- `delete(name, options)`

## Secure defaults

Khi `set` cookie, mặc định khuyến nghị:
- `httpOnly: true`
- `secure: true` (production)
- `sameSite: 'lax'`
- `path: '/'`

Hỗ trợ `maxAge`, `expires`, `domain`.

## Locals

`event.locals` là nơi lưu auth/session context sau khi resolve ở `handle` hook.

## Session pattern

- Session ID trong cookie.
- Session store ở server layer (memory/redis/db do app chọn).
- Load/actions/endpoints đọc từ `locals` thay vì parse lặp lại.

## Auth foundation

fanxikit chỉ cung cấp nền tảng cookie + hooks + locals + redirect/error primitives.
Không đóng gói auth framework hoàn chỉnh ở phase đầu.


