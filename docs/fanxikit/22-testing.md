# 22. Testing strategy

## Mục tiêu

Đảm bảo tính đúng đắn của routing, rendering, data flow và adapter outputs.

## Test layers

- Unit tests: parser/conventions/helpers/runtime primitives.
- Fixture tests: route trees mẫu, snapshot manifest/output.
- E2E tests: navigation/forms/errors trên app thật.
- SSR tests: HTML render + head/css correctness.
- Hydration tests: attach event/reactivity sau hydrate.
- Routing tests: params, matcher, precedence, optional/rest.
- Adapter tests: artifact cho node/static/cloudflare.
- Generated types tests: compile-time assertions.

## CI đề xuất

- Chạy unit + fixture mọi PR.
- Chạy e2e/adapter matrix theo target quan trọng.
- Lưu snapshots có kiểm soát version schema.
