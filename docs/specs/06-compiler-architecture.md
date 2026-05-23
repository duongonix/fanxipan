# 06 - Compiler Architecture

## Pipeline

1. Parse file `.fanxi`.
2. Parse template blocks đặc thù.
3. Tạo AST thống nhất.
4. Analyze reactivity + scope.
5. Generate JS direct DOM.
6. Generate CSS scope metadata.

## Trách nhiệm crates

- `fanxipan_ast`: định nghĩa AST.
- `fanxipan_parser`: parser entry.
- `fanxipan_template`: parser block syntax.
- `fanxipan_analyzer`: graph + semantic checks.
- `fanxipan_codegen`: JS direct DOM output.
- `fanxipan_css`: scoped CSS.
- `fanxipan_compiler`: API compile tổng hợp.



