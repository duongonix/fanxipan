# 08 - CSS System

## Scoped CSS

- Mỗi component có scope hash ổn định từ `filename + css source`.
- CSS nội bộ component khai báo bằng `export const styles = \`...\`` trong module `.fanxi`.
- Compiler rewrite selector theo scope class `.fanxi-s-xxxxxxxx`.
- Runtime chỉ gắn scope class vào DOM node local của component.

```fanxi
function Card() {
  return (<section class="card">Card</section>)
}

export const styles = `
.card { padding: 1rem; }
`

export default Card
```

## Directive liên quan

- `class:*` toggle class theo boolean.
- `style:*` cập nhật style inline theo expression.

## `:global(...)`

- Hỗ trợ `:global(.foo)` để giữ selector global, không scope.
- Hỗ trợ mixed selector như `:global(.dark) button`:
  - phần global giữ nguyên: `.dark`
  - phần local vẫn được scope: `button.fanxi-s-xxxx`

## CSS Variables

- Hỗ trợ native CSS variables (`--token`, `var(--token)`).
- Có thể dùng cùng scoped selector hoặc `:global(:root)` tùy chiến lược theme.

## CSS Nesting

- Ưu tiên native CSS nesting của trình duyệt/toolchain.
- Compiler hiện tại không ép flatten nesting phức tạp; nesting trong `@media/@supports/@layer/@container` vẫn rewrite scope cho selector lồng cơ bản.

## Hướng mở rộng

- Unused CSS detection runs as compiler diagnostics for simple tag/class/id selectors.
- Vite plugin injects scoped CSS during dev/HMR and keeps a foundation for future extraction.
- Critical CSS extraction (future, especially for FanxiKit SSR).
- CSS chunking cho SSR streaming và adapter-level delivery.



