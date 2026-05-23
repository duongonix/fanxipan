# 18. Head, CSS, Assets

## Head collection

Thu thập từ layouts/pages:
- `title`
- `meta`
- `link`
- `script`

Server render cần dedupe và merge theo thứ tự layout -> page.

## Scoped CSS extraction

fanxipan compiler xuất scoped CSS metadata. fanxikit gom theo route/layout để:
- inline critical CSS phù hợp.
- load phần còn lại theo chunk.

## Critical CSS

- SSR response có thể inline critical CSS cho first paint.
- Cấu hình ngưỡng/chiến lược ở build config.

## Asset hashing

Assets/chunks xuất file hash để cache dài hạn.

## Preload hints

- `rel="preload"` cho CSS/font/script quan trọng.
- `rel="modulepreload"` cho client chunks cần hydrate nhanh.


