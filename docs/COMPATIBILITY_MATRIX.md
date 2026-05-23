# Compatibility Matrix

Updated: May 21, 2026.

## Runtime and Tooling
1. Node.js: 22.x (primary CI target)
2. pnpm: 10.x
3. TypeScript: 5.8.x
4. Vite: 6.x

## Operating Systems (CI)
1. Ubuntu latest
2. Windows latest
3. macOS latest

## Rust Toolchain
1. Stable toolchain (as configured in CI)
2. Workspace tests run with `cargo test --workspace --exclude fanxipan_node`

## Notes
1. Matrix reflects what is continuously validated in CI.
2. Other versions may work but are not guaranteed unless added to CI.



