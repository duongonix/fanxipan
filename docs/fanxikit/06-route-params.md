# 6. Route params

## Params object

`params` là object từ route matcher, có trong load/actions/endpoints/hook context.

## Các loại param

- Dynamic: `[id]` -> `{ id: string }`
- Rest: `[...path]` -> `{ path: string }` (chuỗi đã join `/`)
- Optional: `[[lang]]` -> `{ lang?: string }`
- Matcher: `[id=uuid]` -> validate qua matcher `uuid`

## Param matcher

Định nghĩa matcher tại thư mục chuẩn (đề xuất `src/params/`).

Ví dụ:

```ts
// src/params/uuid.ts
export function match(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value);
}
```

Nếu matcher fail, route bị bỏ qua để router xét route khác hoặc về 404.

## Typed params (sau này)

Type generation sẽ phát sinh kiểu params theo route pattern, giúp `event.params` strong-typed ở `+page.ts`, `+page.server.ts`, `+server.ts`.
