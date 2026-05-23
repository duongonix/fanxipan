# 07 - Runtime

## Mục tiêu runtime

Runtime TypeScript phải cực nhỏ, chỉ chứa primitive cần cho mã compiler output.

## Thành phần chính

- state/derived/effect
- scheduler
- mount/cleanup
- DOM helpers
- event helpers
- if/for block helpers

## Non-goals

- Không virtual DOM
- Không component diff engine runtime-heavy
