# 7. Load functions

## Mục tiêu

Định nghĩa contract dữ liệu cho layouts/pages ở cả server và client.

## Loại load

- Universal load: `+page.ts`, `+layout.ts`.
- Server load: `+page.server.ts`, `+layout.server.ts`.

## API cơ bản

```ts
export async function load(event) {
  return {
    user: await event.fetch('/api/user').then((r) => r.json())
  };
}
```

## Event contract

- `params`
- `url`
- `route`
- `fetch`
- `depends`
- `parent`
- `locals` (server-side)
- `cookies` (server-side)
- `request` (server-side)

## `parent()`

Lấy data đã resolve từ layout cha để compose data theo cây.

## `depends()` và `invalidate()`

- `depends(key)`: khai báo dependency key cho load.
- `invalidate(key|predicate)`: client runtime yêu cầu load lại dữ liệu phụ thuộc key.

## `fetch` wrapping

`event.fetch` kế thừa cookies/headers cần thiết ở SSR, đồng thời trace dependency để invalidation và diagnostics.

## Serialization

Data trả về từ server load phải serialization-safe (JSON-compatible + các kiểu mở rộng được framework hỗ trợ rõ ràng).

## Error/redirect

- Có thể throw `error(status, body)`.
- Có thể throw `redirect(status, location)`.
- Runtime bắt và chuyển thành response/navigation phù hợp.
