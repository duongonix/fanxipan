# 9. API routes

## Convention

Mỗi route segment có thể có `+server.ts` để xử lý HTTP methods.

```ts
export function GET(event) {}
export function POST(event) {}
export function PUT(event) {}
export function PATCH(event) {}
export function DELETE(event) {}
```

## Event

`event` gồm `request`, `url`, `params`, `locals`, `cookies`, `fetch`.

## Response helpers

- `json(data, init?)`
- `text(body, init?)`
- `redirect(status, location)`
- `error(status, body)`

## Quy tắc

- Method không export -> 405 Method Not Allowed.
- Route không tồn tại -> 404.
- Endpoint chạy server-side, không bundle vào client.
