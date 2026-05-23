# 1. Tổng quan fanxikit

## Mục tiêu

- Cung cấp fullstack/SSR framework cho ứng dụng fanxipan.
- Chuẩn hóa routing, data loading, actions, API routes, deployment.
- Giữ phần fanxipan core gọn, ổn định, compiler-first.

## Triết lý

- Framework layering rõ ràng: fanxipan là nền, fanxikit là orchestration.
- Convention over configuration cho app DX.
- Progressive enhancement: SSR trước, hydrate sau, CSR fallback khi cần.
- Web standards trước tiên: Request/Response, URL, FormData, Cookies.

## Phạm vi

- File-based routing + nested layouts.
- Universal/server load, actions, API routes.
- SSR/hydration pipeline, rendering modes (SSR/CSR/prerender/SPA).
- Hooks, cookies/sessions foundation, env/config.
- Adapters/build output/manifest/type generation.

## Non-goals

- Không đưa logic fullstack vào fanxipan core.
- Không biến fanxipan thành fanxikit.
- Không phá kiến trúc no virtual DOM/direct DOM update của fanxipan.

## Vì sao fanxikit tồn tại

- Ứng dụng production cần nhiều hơn compiler/runtime: routing convention, server runtime, deployment targets, data lifecycle.
- Nếu mỗi app tự ghép các phần này sẽ thiếu chuẩn chung, khó scale, khó maintain.
- fanxikit cung cấp một "application contract" thống nhất cho ecosystem.

## fanxikit khác fanxipan ở đâu

- fanxipan: component compiler + runtime primitives.
- fanxikit: app framework fullstack chạy trên primitives đó.


