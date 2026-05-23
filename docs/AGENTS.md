# AGENTS.md - Quy tắc cộng tác cho Codex/Contributor

## Mục tiêu

Tài liệu này định nghĩa nguyên tắc đóng góp để mọi thay đổi giữ đúng định hướng fanxipan: compiler-first, Rust-centered, runtime nhỏ, no virtual DOM.

## Nguyên tắc bắt buộc

1. Không đưa virtual DOM vào runtime hoặc compiler output.
2. Không thay đổi syntax đã chốt trong specs.
3. Ưu tiên compile-time transform thay vì runtime magic.
4. Runtime TypeScript phải nhỏ, tập trung primitives.
5. Mỗi crate/package một trách nhiệm rõ ràng.
6. Luôn cập nhật docs/spec khi đổi kiến trúc.
7. `.fanxi` chuẩn là module function component trả Fanxi template; không biến Fanxipan thành `.svelte` section format hoặc JSX clone.

## Quy tắc thiết kế mã

1. Tách module nhỏ, tránh file monolithic.
2. API công khai phải ổn định và có kiểu rõ ràng.
3. Diagnostics phải có line/column + suggestion khi có thể.
4. Tránh optimization sớm làm phức tạp kiến trúc.

## Quy trình thay đổi

1. Đọc `docs/SNAPSHOT.md` và specs liên quan.
2. Chốt phạm vi crate/package bị ảnh hưởng.
3. Cập nhật test fixture tương ứng.
4. Cập nhật docs kiến trúc + roadmap nếu có thay đổi phase.

## Definition of Done

1. Build/check cơ bản chạy được.
2. Không phá syntax `.fanxi` đã chốt.
3. Không thêm phụ thuộc runtime nặng vô lý.
4. Docs liên quan đã cập nhật.



