# SNAPSHOT - Trạng thái khởi tạo fanxipan

## Ngày snapshot

2026-05-21

## Scope đã hoàn thành

1. Dựng monorepo Rust workspace + PNPM workspace.
2. Tạo skeleton cho toàn bộ crates, packages, examples, tests, schemas.
3. Chuẩn hóa specs tiếng Việt cho toàn bộ hệ thống (01-16).
4. Phase 1.4: parser directive/attribute cơ bản + codegen block anchors + keyed loop reconciliation baseline.
5. Phase 2 (baseline): parse ComponentNode, props/children mount API, event modifiers, bind/class/style directive codegen, lifecycle/runtime hooks cơ bản.
6. Phase 2.1 + nâng cấp scoped CSS: scope hash ổn định theo `filename + css`, rewrite selector tốt hơn (group selector, pseudo selector, `:global(...)`, nested at-rules cơ bản), compile output kèm `css/scope`.
7. Phase 3 (baseline): Vite plugin transform + HMR handler + diagnostics warning + source map object + create-fanxipan scaffold command.
8. Compiler diagnostics nâng cấp: template parse errors có `line/column/span`, semantic checks (`invalid key`, `mutate derived`, `unknown identifier`, `invalid bind target`), compile output kèm diagnostics hợp nhất.
9. Codegen/runtime nâng cấp: `if` branch guard tránh rebuild thừa, event/bind dùng listener cleanup context, runtime tách module `reactivity/dom/lifecycle/client/internal`.
10. Vite/HMR + DX nâng cấp: plugin integration test, boundary-aware hot update, compiler wrapper emit `create()` + HMR marker, scripts `build:core`/`build:example:basic` để examples chạy một lệnh.
11. Test strategy triển khai: compiler fixture snapshots, runtime unit tests (Vitest), smoke examples build (`basic` + `todo`) qua script `test:smoke:examples`.
12. Analyzer semantic refactor: tách module `expr/scope/symbols/semantic`, scope stack rõ ràng, check key/bind/identifier/mutate-derived chắc hơn.
13. Runtime reactivity nâng cấp: scheduler microtask queue, effect dependency tracking + cleanup, derived reactive update, flush API cho deterministic tests.
14. HMR nâng cấp theo component boundary graph: duyệt invalidation qua importers, reload boundary liên quan, phát event `fanxipan:hmr-boundaries`.
15. Compiler wrapper ưu tiên bridge native: `packages/compiler` cố gắng dùng `fanxipan-node` (`compile_for_node_json`) rồi fallback TS wrapper an toàn.
16. fanxipan public API cứng hơn: `render/hydrate` có contract rõ mode, cleanup idempotent, hành vi clear target tách biệt.
17. Dựng package native chính thức `packages/fanxipan-node` (NAPI loader + typings + build script `@napi-rs/cli`) và nâng `crates/fanxipan_node` thành `cdylib` có exports `compileRx/compileForNode/compileForNodeJson`.
18. Core build flow cập nhật để build native trước (`build:core` chạy `pnpm --filter fanxipan-node build`).
19. Bổ sung CI matrix đa nền tảng (Linux/Windows/macOS) cho Rust + JS test/build trong `.github/workflows/ci.yml`.
20. Bổ sung test hardening cho compiler native-normalization (`packages/compiler/src/transform.native.test.ts`) để khóa lỗi component import, default export contract, derived replacement, HMR state injection.
21. Semantic analyzer strict hơn cho edge cases:
    - key expression phải tham chiếu loop item (tránh key global/ngoại vi không ổn định),
    - chặn loop index trùng tên loop item,
    - chặn side-effect expression trong template (ví dụ `count++`, `a = b`) để giữ compile-time purity.
22. Public API fanxipan bắt đầu đóng băng theo contract version:
    - thêm `contractVersion = "1.0.0"` và `fanxipan_API_CONTRACT_VERSION`,
    - siết behavior: `render/hydrate` ném lỗi khi target không phải `Element`,
    - bổ sung test contract cho `packages/fanxipan`.
23. Nâng độ sâu pipeline:
    - thêm job E2E browser (`playwright/chromium`) cho ví dụ basic trong CI,
    - thêm workflow release native đa nền tảng (`release-native.yml`) để build artifact `.node` cho Linux/Windows/macOS.
24. HMR contract nâng cấp theo component boundary:
    - thêm cơ chế `__fanxipan_HMR_SNAPSHOT__` / `__fanxipan_HMR_RESTORE__` để preserve state giữa module cũ/mới,
    - runtime `fanxipan` gọi snapshot trước unmount và restore trước remount.
25. Chuẩn hóa public contract compiler/runtime cho component:
    - thêm type contract `CompiledComponentLike` + `RenderMode` ở runtime internal contract,
    - export chính thức qua `packages/runtime`.
26. Scheduler runtime hardening:
    - flush loop ổn định theo batch, có guard chống vòng flush vô hạn (`MAX_FLUSH_ITERATIONS`),
    - tránh enqueue microtask thừa bằng cờ `pending`.
27. E2E test depth tăng:
    - thêm `scripts/e2e-examples.mjs` phủ `basic/todo/router`,
    - CI job `E2E Examples` build + chạy browser assertions.
28. CSS system hardening:
    - scoped CSS hash ổn định giữ nguyên,
    - rewrite `:global(...)` chính xác hơn (kể cả mixed selector `:global(.dark) button`),
    - bổ sung test regression cho global/local selector mix.

## Kiến trúc hiện tại

- Compiler lõi: `fanxipan_parser` -> `fanxipan_template` -> `fanxipan_analyzer` -> `fanxipan_codegen`.
- API tổng hợp: `fanxipan_compiler`.
- JS wrapper: `packages/compiler`.
- Runtime: `packages/runtime`.
- Public package: `packages/fanxipan`.
- Tooling: CLI Rust + Vite plugin.

## Những gì CHƯA implement đầy đủ

1. Parser chi tiết syntax `.fanxi`.
2. Reactivity graph thực tế.
3. DOM codegen tối ưu hóa production.
4. SSR/hydration thực chiến.
5. Router file-based.
6. Đóng gói và phát hành prebuilt binary chính thức lên registry (workflow artifact đã có, publish pipeline/versioning semver chưa khóa).
7. Hoàn thiện stabilization production cho reactivity/component/HMR/codegen (đang trong tiến trình hardening theo milestone).
8. E2E coverage vẫn cần mở rộng thêm cho HMR preserve-state scenario, event/bind edge cases, và stress mutation sequence.
9. Native release pipeline mới dừng ở build artifact đa nền tảng; chưa có publish/release signing/version-gate hoàn chỉnh.

## Tiêu chí cho bước tiếp theo

1. Hoàn thiện parser `.fanxi` và semantic analyzer theo hướng production (error recovery + scope/assignability sâu hơn).
2. Đẩy compiler JS wrapper sang native bridge mặc định khi có binary `fanxipan-node`.
3. Tối ưu codegen DOM fine-grained hơn (giảm clear/rebuild thô, keyed reconciliation sâu hơn).
4. Tiếp tục harden runtime scheduler/lifecycle và HMR preserve state ở cấp component boundary.



