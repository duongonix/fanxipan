# 10. SSR và Hydration

## Pipeline

1. Server match route + resolve layouts/page.
2. Chạy server load/universal load theo policy.
3. Render HTML trên server.
4. Thu thập head, CSS, serialized data.
5. Trả HTML + manifest references cho client.
6. Client hydrate theo boundary metadata.

## Thành phần chính

- Server render.
- Client hydrate.
- Hydration boundary theo route/component.
- Serialized load data.
- Route manifest.
- Head/CSS collection.

## Error handling

- Lỗi lúc load/render: map vào nearest `+error.fanxi`.
- Lỗi không recover: fallback error response và diagnostics.

## Mismatch handling

- Detect mismatch giữa HTML server và hydrate result.
- Dev: cảnh báo chi tiết vị trí/component.
- Prod: cố gắng recover cục bộ, tránh crash toàn app.

## Ranh giới fanxipan vs fanxikit

- fanxipan cần primitive hydrate/render và metadata cần thiết.
- fanxikit chịu trách nhiệm orchestration SSR/hydration end-to-end.



