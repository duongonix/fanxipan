# 16. Manifest và Build output

## Các manifest chính

- Client manifest: map route chunk/assets phía client.
- Server manifest: module graph cho SSR runtime.
- Route manifest: route tree + loaders/actions/endpoints metadata.
- Asset manifest: hash filenames, public URLs.
- Dependency graph: quan hệ module để preload/prefetch.
- CSS manifest: route -> CSS chunks/scoped styles.
- Prerender manifest: danh sách page đã prerender và fallback policy.

## Build output folders (đề xuất)

```text
.build/
  client/
  server/
  prerendered/
  manifests/
```

## Yêu cầu

- Manifest ổn định, versioned.
- Có schema để adapter tiêu thụ an toàn.
- Có checksum hoặc hash để cache hiệu quả.
