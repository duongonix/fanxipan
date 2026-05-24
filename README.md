# Fanxipan

Fanxipan is a compiler-first framework for building modern single-page web applications.
It compiles declarative `.fanxi` components into optimized JavaScript with predictable runtime behavior, fast updates, and a clean developer experience.

write by Rust and Typescript

Fanxipan is designed for teams that want:
- a simple authoring model
- explicit, framework-level reactivity
- production-ready build and release workflows

Public API stays ergonomic:

```ts
import fanxipan from "fanxipan";
import { Routes } from "fanxipan/router";
```

## Why Fanxipan

Fanxipan focuses on practical engineering outcomes:
- Compiler-driven output for efficient DOM updates
- Clear component contract and state model
- Built-in support for modern tooling with Vite
- Structured monorepo architecture for framework evolution

## Project Structure

- `packages/`: framework packages (`fanxipan`, runtime, router, compiler, tooling)
- `crates/`: Rust core and native/compiler backend components
- `examples/`: runnable example applications
- `scripts/`: build, verification, release, and publishing automation

## Supporting Fanxipan

Fanxipan is an MIT-licensed open-source project.
If Fanxipan helps your work, you can support the project by:
- contributing code, tests, and documentation
- reporting reproducible issues
- reviewing pull requests
- sharing the framework with your team and community

## Roadmap

To see current priorities and upcoming work, review:

- [ROADMAP_90.md](/C:/Users/duong/Workspace/dev/rust/app/renex/ROADMAP_90.md)

## Contributing

Contributions are welcome.
Please follow the repository conventions and run validation checks before opening a pull request.

Useful areas to start:
- `packages/` for framework APIs and tooling
- `crates/` for Rust/compiler internals
- `examples/` for integration coverage and developer workflows

## Operational Status

If package installation or release behavior appears unavailable, verify:
- npm registry status
- GitHub Actions status for this repository
- local network, DNS, or proxy configuration

## License

MIT
