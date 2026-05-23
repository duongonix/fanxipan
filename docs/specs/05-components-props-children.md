# 05 - Component, Props, Children

## Component model

Component là hàm trả template `.fanxi`.

## Props

- Truyền qua thuộc tính như `<UserCard user={user} />`.
- Shorthand prop dùng `{name}`: `<UserCard {user} />`.
- Spread props: `<UserCard {...props} />`.
- Component nhận props bằng tham số function: `function UserCard({ user })`.
- Fallback props dùng destructuring default: `function UserCard({ user = null })`.

## Children

- Children truyền như nested nodes.
- Default child projection uses `<slot />`.
- Snippet/render blocks provide render-prop style composition:
  `{#snippet row(item)}...{/snippet}` and `{@render row(item)}`.

## Dynamic component

`<component this={Current} />` cho runtime quyết định constructor hiện tại.

## Cleanup boundary

Nested components receive their own render context, cleanup list and delegated event bucket. Parent cleanup tears down child component cleanup, action cleanup, listeners, subscriptions and style/head nodes.

