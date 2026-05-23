# fanxikit Spec

fanxikit là application framework fullstack/SSR được xây dựng trên fanxipan, hướng tới trải nghiệm tương tự SvelteKit, Next.js, Nuxt nhưng giữ triết lý compiler-first của hệ fanxipan.

fanxikit **không thay thế fanxipan**. Hai framework phát triển song song:
- fanxipan tập trung compiler, runtime reactivity, DOM update trực tiếp, no virtual DOM.
- fanxikit tập trung routing app-level, SSR orchestration, load/actions, API routes, adapters, deployment.

Hướng phụ thuộc bắt buộc:
- `fanxikit -> fanxipan`
- Không cho phép `fanxipan -> fanxikit`

Mục tiêu của bộ tài liệu này là làm spec implementation-ready để team hoặc Codex có thể triển khai fanxikit đúng hướng, không làm phình fanxipan core.

## Danh sách tài liệu

- `01-overview.md`
- `02-relationship-with-fanxipan.md`
- `03-project-structure.md`
- `04-file-based-routing.md`
- `05-layouts.md`
- `06-route-params.md`
- `07-load-functions.md`
- `08-form-actions.md`
- `09-api-routes.md`
- `10-ssr-hydration.md`
- `11-rendering-modes.md`
- `12-hooks-middleware.md`
- `13-cookies-sessions-auth.md`
- `14-env-config.md`
- `15-adapters-deployment.md`
- `16-manifest-build-output.md`
- `17-routing-runtime-navigation.md`
- `18-head-css-assets.md`
- `19-type-generation.md`
- `20-dev-server-hmr.md`
- `21-errors-diagnostics.md`
- `22-testing.md`
- `23-roadmap.md`
- `24-fanxipan-core-requirements.md`
- `25-production-readiness.md`


