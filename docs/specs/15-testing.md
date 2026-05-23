# 15 - Testing Strategy

## Test tầng Rust

- Unit test parser/template/analyzer/codegen.
- Snapshot test compiler output (`insta`).
- Fixture-based regression test.

## Test tầng JS

- Runtime unit test bằng Vitest.
- Vite plugin transform test.

## Test E2E

- Example apps + Playwright (phase sau).

## Cấu trúc

- `tests/compiler`
- `tests/runtime`
- `tests/ssr`
- `tests/fixtures`
