# 8. Form actions

## Mục tiêu

Xử lý form mutation server-side theo route convention.

## Khai báo

Trong `+page.server.ts`:

```ts
export const actions = {
  default: async (event) => {},
  login: async (event) => {}
};
```

## Hành vi

- `default`: action mặc định.
- named action: gọi qua query/action name convention.
- Request method chủ đạo: `POST`.

## Progressive enhancement

- Không JS: form submit full-page vẫn hoạt động.
- Có JS: tương lai hỗ trợ `use:enhance` để submit async, cập nhật cục bộ.

## Kết quả action

- Thành công: trả data cho page (ví dụ `form` state).
- Validation error: trả structured error (status 4xx + field errors).
- Redirect: throw `redirect(...)`.
- Lỗi ngoài dự kiến: đi vào error boundary/hook.
