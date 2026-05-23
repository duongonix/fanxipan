# 12. Hooks và Middleware-like flow

## Files

- `src/hooks.server.ts`
- `src/hooks.client.ts`

## Server hooks

- `handle({ event, resolve })`: bao request lifecycle, có thể set `event.locals`, rewrite response.
- `handleFetch({ event, request, fetch })`: can thiệp fetch nội bộ trong load/actions.
- `handleError({ error, event })`: logging/reporting tập trung.

## Client hooks

- `handleError({ error, event })`
- `beforeNavigate(navigation)`
- `afterNavigate(navigation)`

## Tính chất

- Middleware-like nhưng vẫn tôn trọng model route/layout.
- Không thay thế routing tree; chỉ bổ sung lifecycle interception.
