# 13 - Plugin System

## Mục tiêu

Cho phép mở rộng compile pipeline và tooling mà không fork core.

## Plugin hook định hướng

- BeforeParse
- AfterParse
- AfterAnalyze
- BeforeGenerate
- AfterGenerate

## Nguyên tắc an toàn

- Plugin không được phá invariant AST.
- Có version contract giữa core và plugin.
