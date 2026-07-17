# Kitbash starter

Scaffold for a small design-system project built with [`@ktbsh/sdk`](https://www.npmjs.com/package/@ktbsh/sdk).

Created by:

```bash
kitbash init my-design-system
# or
bunx @ktbsh/sdk init my-design-system
```

## Project layout

```text
.
├── README.md
├── kitbash.config.ts   # reserved for future config (not applied by the compiler yet)
├── package.json
└── src/
    ├── tokens.json
    └── components/
        ├── button.ts
        └── input.ts
```

## Next steps

```bash
bun install
bun run build
```

**Requires [Bun](https://bun.sh) ≥ 1.0.**

Output lands in `dist/`:

- `dist/vanilla/*.js` — browser custom elements (`uhtml` bundled)
- `dist/react/*.js` + `*.d.ts` — React wrappers
- `dist/custom-elements.json` — IDE / CEM metadata

## Try the examples

| File | Tag | Notes |
|------|-----|--------|
| `src/components/button.ts` | `my-button` | Variants, slot, click state |
| `src/components/input.ts` | `kitbash-input` | `formAssociated`, focus delegation |

**Vanilla:**

```html
<script type="module">
  import './dist/vanilla/button.js';
</script>
<my-button variant="primary">Hello</my-button>
```

**React:**

```tsx
import { MyButton } from './dist/react/button.js';

<MyButton variant="primary" onClick={() => {}}>Hello</MyButton>
```

## Add a component

1. Create `src/components/card.ts` with `export default defineComponent({ tag: 'my-card', … })`.
2. Run `bun run build`.
3. Import `dist/vanilla/card.js` or `dist/react/card.js`.

Full authoring API, theming, forms, and troubleshooting: the [**@ktbsh/sdk** README on npm](https://www.npmjs.com/package/@ktbsh/sdk).

## Notes

- `kitbash.config.ts` is a placeholder; build always uses `src/components` → `dist/` for now.
- Prefer property bindings like `.value=${props.value}` for inputs so focus is not lost on re-render.
- Keep `render` / `events` free of outer closures (they are serialized into the compiled output).
