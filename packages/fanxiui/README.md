# fanxiui

FanxiUI is the official headless UI primitives library for Fanxipan/FanxiKit.

- Unstyled by default
- Accessible by default
- Composable namespace APIs
- Fine-grained DOM updates, no virtual DOM

## Install

```bash
pnpm add fanxiui
```

## Usage

```ts
import { Dialog, Tabs, Checkbox } from "fanxiui";
```

## Styling

FanxiUI does not ship theme CSS. Style with `class`, `style`, and data attributes:

- `data-state`
- `data-disabled`
- `data-orientation`

## Inspiration

FanxiUI is inspired by Bits UI, Radix UI, Melt UI, and React Aria, but designed specifically for Fanxipan with its own API and architecture.

## Current Status

Phase 1 is implemented with core utilities and foundational components.
Select/DropdownMenu are scaffolded and planned for next phases.
