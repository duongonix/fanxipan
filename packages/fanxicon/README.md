# fanxicon

Official icon library for Fanxipan/FanxiKit.

## Install

```bash
pnpm add fanxicon
```

## Usage

```ts
import { Home, Search, User } from "fanxicon";

function App() {
  return (
    <div>
      <Home />
      <Search size={20} />
      <User color="#60a5fa" strokeWidth={1.75} />
    </div>
  );
}
```

## Props

```ts
type IconProps = {
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
  class?: string;
  style?: string | Record<string, string | number>;
  title?: string;
  ariaLabel?: string;
  role?: string;
  id?: string;
  [key: string]: any;
};
```

Defaults:
- `size=24`
- `color="currentColor"`
- `strokeWidth=2`
- `fill="none"`
- `strokeLinecap="round"`
- `strokeLinejoin="round"`

Accessibility:
- Without `title`/`ariaLabel`: `aria-hidden="true"`
- With `title` or `ariaLabel`: `role="img"` and `aria-hidden="false"`
- With `title`: a `<title>` element is rendered.

Styling tip:
- Icons use `currentColor` by default, so they inherit text color naturally.

## Regenerate Icons

```bash
pnpm --filter fanxicon sync
pnpm --filter fanxicon optimize
pnpm --filter fanxicon generate
```

`sync` supports:
- `LUCIDE_ICONS_DIR=/path/to/lucide/icons`
- or auto-clone Lucide into `.cache/lucide` and copy from there.

## License And Attribution

Fanxicon includes icons derived from Lucide Icons.

- Lucide source: [github.com/lucide-icons/lucide](https://github.com/lucide-icons/lucide)
- Lucide license: ISC

See `THIRD_PARTY_LICENSES.md` for attribution details.

