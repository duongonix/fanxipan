# 20. Dev server và HMR

## Dev server

- Tích hợp chặt với Vite.
- Theo dõi thay đổi `src/routes`, hooks, config liên quan.

## HMR phạm vi

- `+page.fanxi` / `+layout.fanxi`: hot reload component subtree.
- `+page.ts` / `+layout.ts`: load function reload + re-run data.
- `+server.ts` / `+page.server.ts`: server module reload an toàn.

## Route manifest hot update

Khi thêm/xóa/đổi tên file route, manifest cập nhật tức thì và router runtime sync lại.

## Diagnostics overlay

Dev overlay hiển thị:
- route conflict
- invalid exports
- hydration warnings
- stack/code frame

