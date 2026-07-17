# Kitbash

Small monorepo for **Kitbash** — a compiler-driven toolkit that turns a single TypeScript component definition into native Web Components (plus React wrappers).

Early project (`0.1.x`). The idea is simple: define components once, compile them, and try them in plain HTML, React, or Svelte while the API is still free to evolve.

**Using the published package?** Start here → [`packages/sdk/README.md`](./packages/sdk/README.md)  
**npm:** [`@ktbsh/sdk`](https://www.npmjs.com/package/@ktbsh/sdk)

---

## What this repo is

| Path | Role |
|------|------|
| [`packages/sdk`](./packages/sdk) | The publishable SDK: `defineComponent`, compiler, `kitbash` CLI, init templates — [README](./packages/sdk/README.md) |
| [`templates/default`](./templates/default) | Local workspace design-system fixture used by the sandbox and `bun run dev` — [README](./templates/default/README.md) |
| [`sandbox`](./sandbox) | Vite playground — React 19, Svelte 5, and Vanilla side by side — [README](./sandbox/README.md) |
| [`scripts`](./scripts) | Dev watcher (`dev.ts`) and pre-commit helper |

Bun workspaces wire these together (`packages/*`, `templates/*`, `sandbox`).

```text
kitbash-sdk/
├── packages/sdk/          # @ktbsh/sdk (npm)
│   ├── src/               # defineComponent, compiler, CLI
│   └── templates/default/ # copied by `kitbash init`
├── templates/default/     # in-repo sample design system + dist/
├── sandbox/               # multi-framework playground
├── scripts/dev.ts         # watch components + Vite
└── packages/sdk/README.md # full consumer docs
```

The **authoring → compile → consume** flow:

```text
  defineComponent({ … })     # src/components/*.ts
            │
            ▼
     kitbash build
            │
     ┌──────┴──────┐
     ▼             ▼
  vanilla CE    React wrappers
  (Shadow DOM,  (typed JSX +
   uhtml)        kitbash-change)
            │
            ▼
     custom-elements.json
```

---

## Requirements

- [Bun](https://bun.sh) ≥ 1.0  
- For the playground: Vite 8, React 19, Svelte 5 (installed via workspace)

The SDK CLI is built for Bun. Prefer `bun` / `bunx` over Node’s `npx`.

---

## Use the SDK (published)

```bash
bun add -g @ktbsh/sdk
kitbash init my-design-system
cd my-design-system
bun install
bun run build
```

Or without a global install:

```bash
bunx @ktbsh/sdk init my-design-system
```

Full API, theming, forms, packaging, and troubleshooting: **[packages/sdk/README.md](./packages/sdk/README.md)**.

---

## Develop this monorepo

```bash
bun install
```

### Build the SDK package

```bash
cd packages/sdk
bun run build
# → dist/cli.js (bin: kitbash)
```

### Sample components + playground

`bun run dev` (repo root) will:

1. Compile `templates/default/src/components` → `templates/default/dist`
2. Watch those sources and rebuild on change
3. Start the sandbox Vite server (typically `http://localhost:3000`)

```bash
bun run dev
```

Open the sandbox index to jump between React, Svelte, and Vanilla demos. They import compiled output from `templates/default/dist`.

### Lint / format

```bash
bun run format   # Biome format
bun run lint     # Biome lint
bun run check    # Biome check --write
```

---

## Authoring snapshot

One file, one default export:

```ts
import { defineComponent } from '@ktbsh/sdk';

export default defineComponent({
  tag: 'kitbash-input',
  formAssociated: true,
  delegatesFocus: true,
  props: {
    name: { type: String, default: '' },
    value: { type: String, default: '' },
    placeholder: { type: String, default: '' },
  },
  styles: `
    :host {
      display: inline-block;
      --kitbash-input-border: #ccc;
    }
    input {
      border: 1px solid var(--kitbash-input-border);
    }
  `,
  events: {
    'input input'(e: Event, { setState }) {
      const target = e.target as HTMLInputElement;
      setState({ value: target.value });
    },
  },
  render({ props, html }) {
    return html`
      <input
        part="input-root"
        name=${props.name}
        .value=${props.value}
        placeholder=${props.placeholder}
      />
    `;
  },
});
```

**React consumer** (after build):

```tsx
import { useState } from 'react';
import { KitbashInput } from 'my-design-system/react/input.js';

export function App() {
  const [val, setVal] = useState('');

  return (
    <KitbashInput
      name="username"
      value={val}
      onKitbashChange={(e) => setVal(e.detail.props.value)}
      placeholder="Enter username"
    />
  );
}
```

**Svelte 5** uses the vanilla custom element directly:

```svelte
<script lang="ts">
  import 'my-design-system/vanilla/input.js';
  let val = $state('');
</script>

<kitbash-input
  value={val}
  onkitbash-change={(e) => (val = e.detail.props.value)}
  placeholder="Enter username"
></kitbash-input>
```

### Capabilities (short)

- **Slots** — standard `<slot>` in Shadow DOM; React `children` → light DOM  
- **Theming** — CSS variables on `:host`, `::part(...)`, optional `src/tokens.json`  
- **Forms** — `formAssociated` + `ElementInternals`, optional `delegatesFocus`  
- **CEM** — `dist/custom-elements.json` for editor autocomplete  
- **uhtml v4.7.1** — pinned for stable Shadow DOM updates (do not casually bump to v5)

Details and caveats live in the [SDK README](./packages/sdk/README.md).

---

## Workspace notes

| Topic | Detail |
|-------|--------|
| **Two “default” templates** | `packages/sdk/templates/default` is what `kitbash init` copies for users ([README](./packages/sdk/templates/default/README.md)). `templates/default` is the monorepo fixture ([README](./templates/default/README.md)). Overview: [templates/README.md](./templates/README.md). Keep example components roughly in sync when you change scaffolds. |
| **Config file** | Scaffold includes `kitbash.config.ts`, but the compiler does not read it yet (`src/components` → `dist/` is fixed). |
| **Agent / contrib pins** | See [`AGENTS.md`](./AGENTS.md) and [`GEMINI.md`](./GEMINI.md) for toolchain pins and architecture notes. |
| **Roadmap scratchpad** | [`TODO.md`](./TODO.md) |

---

## Status

Experimental personal project. Expect breaking changes in `0.1.x` while the compiler and authoring API settle. Feedback from real design-system experiments is welcome.

## License

MIT (see package metadata under `packages/sdk`).
