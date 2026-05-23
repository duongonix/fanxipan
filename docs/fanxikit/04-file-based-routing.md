# 4. File-based routing

## Route files

- `+page.fanxi`: page component.
- `+layout.fanxi`: layout component cho segment.
- `+error.fanxi`: error boundary UI.
- `+page.ts`: universal page load.
- `+page.server.ts`: server-only page load + actions.
- `+layout.ts`: universal layout load.
- `+layout.server.ts`: server-only layout load.
- `+server.ts`: API route handlers theo HTTP method.

## Mapping ví dụ

- `src/routes/+page.fanxi` -> `/`
- `src/routes/about/+page.fanxi` -> `/about`
- `src/routes/blog/[id]/+page.fanxi` -> `/blog/:id`
- `src/routes/docs/[...slug]/+page.fanxi` -> `/docs/*`
- `src/routes/[[lang]]/+page.fanxi` -> `/:lang?`

## Nested routes

Router resolve theo cây thư mục. Mỗi segment có thể có layout riêng và kế thừa từ cha.

## Route groups

- Group syntax: `(group)` để nhóm route về tổ chức file mà không đổi URL.
- Ignored groups: thư mục bắt đầu `_` hoặc cấu hình ignore pattern sẽ không tạo route segment.

## Param conventions

- Dynamic: `[id]`
- Rest: `[...slug]`
- Optional: `[[lang]]`
- Matcher: `[id=uuid]`

## Quy tắc conflict

- Mỗi URL pattern phải unique.
- Nếu trùng precedence, build fail với diagnostics chỉ rõ file xung đột.

