# @ktbsh/sdk

**Kitbash** is a small, compiler-driven toolkit for building design-system components once and shipping them as native Web Components — with optional React wrappers for free.

You author a single TypeScript config (`defineComponent`). The CLI evaluates it, then emits:

- **Vanilla custom elements** (Shadow DOM + [uhtml](https://github.com/WebReflection/uhtml) DOM diffing, uhtml bundled in)
- **React wrappers** (typed JSX props + event bridging)
- A **Custom Elements Manifest** (`custom-elements.json`) for IDE autocomplete

This project is early (`0.1.x`) and intentionally experimental. The goal is a practical loop for trying design-system ideas: define → compile → drop into React, Svelte, or plain HTML. APIs and output shape will evolve as real usage teaches what matters.

**Supported surface (what works / what does not):** monorepo [`docs/SUPPORTED.md`](../../docs/SUPPORTED.md).  
**Audit / improvement notes:** monorepo [`docs/improvements/`](../../docs/improvements/).

---

## Why this exists

Most design-system work either:

1. Binds hard to one framework, or  
2. Ships hand-written Web Components that are painful to maintain and wrap.

Kitbash tries a middle path: **author once as data + render functions**, then let a compiler produce the boring runtime glue (property/attribute sync, stylesheets, form association hooks, React refs/events, CEM metadata).

You get a short authoring surface; consumers get real custom elements that work outside your build tool.

---

## Features

| Area | What you get today |
|------|--------------------|
| **Author once** | `defineComponent({ tag, props, state, styles, events, render })` |
| **Vanilla output** | Minified custom element with Shadow DOM and constructable stylesheets |
| **React output** | `forwardRef` wrapper, `onKitbashChange`, children → light DOM / slots |
| **Theming** | CSS variables on `:host`, shadow `part` hooks, optional `tokens.json` |
| **Forms** | `formAssociated` + `ElementInternals`, optional `delegatesFocus` |
| **DX** | `kitbash init` scaffold, `kitbash build`, CEM for editors |
| **Runtime deps for consumers** | Vanilla bundles bake in `uhtml` — no extra install for end apps |

**Not (yet):** full Svelte wrapper codegen (use vanilla tags), config-driven `outDir`/framework toggles (see [Known limitations (0.1.x)](#known-limitations-01x)), watch mode, Storybook plugin, etc.

---

## Requirements

- **[Bun](https://bun.sh) ≥ 1.0** — required for the CLI and compiler (`engines.bun`)
- A project that can import TypeScript component sources at build time (Bun does this natively)

> The published CLI is built for the Bun runtime (`bun build … --target bun`). Use `bunx kitbash` or a global Bun install, not Node’s `npx`, for reliable results.

---

## Quick start

### 1. Scaffold a design system

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

### 2. What you get

```text
my-design-system/
├── kitbash.config.ts      # reserved for future config (see notes below)
├── package.json           # "build": "kitbash build"
└── src/
    ├── tokens.json        # design tokens → CSS variables on :host
    └── components/
        ├── button.ts      # example component
        └── input.ts       # form-associated example
```

After `bun run build`:

```text
dist/
├── custom-elements.json
├── vanilla/
│   ├── button.js          # browser-ready custom element (uhtml inlined)
│   ├── button.src.js      # intermediate source (generated)
│   ├── input.js
│   └── input.src.js
└── react/
    ├── button.js
    ├── button.d.ts
    ├── input.js
    └── input.d.ts
```

### 3. Define your own component

```ts
// src/components/badge.ts
import { defineComponent } from '@ktbsh/sdk';

export default defineComponent({
  tag: 'my-badge',
  props: {
    label: { type: String, default: '' },
    tone: { type: String, default: 'neutral' },
  },
  styles: `
    :host {
      display: inline-flex;
      --badge-bg: #eaeaea;
      --badge-color: #111;
    }
    span {
      background: var(--badge-bg);
      color: var(--badge-color);
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      font-size: 0.75rem;
    }
    .danger { --badge-bg: #fee2e2; --badge-color: #991b1b; }
  `,
  render({ props, html }) {
    return html`
      <span part="badge-root" class=${props.tone}>${props.label}</span>
    `;
  },
});
```

```bash
bun run build
# ✅ Compiled <my-badge>
```

### 4. Use the output

**Vanilla / any framework that supports custom elements:**

```html
<script type="module">
  import './dist/vanilla/badge.js';
</script>
<my-badge label="New" tone="danger"></my-badge>
```

**React 19:**

```tsx
import { MyBadge } from './dist/react/badge.js';

export function App() {
  return <MyBadge label="New" tone="danger" />;
}
```

**Svelte 5** (import the vanilla element; bind with DOM events):

```svelte
<script lang="ts">
  import './dist/vanilla/input.js';
  let val = $state('');
</script>

<kitbash-input
  value={val}
  onkitbash-change={(e) => (val = e.detail.props.value)}
  placeholder="Type…"
></kitbash-input>
```

---

## How it works

Kitbash uses an **evaluation compiler**, not an AST rewrite of your source files.

```text
  src/components/*.ts
         │
         │  Bun dynamic import()
         ▼
  default export = ComponentConfig
         │
         │  serialize render/events + emit class source
         ▼
  dist/vanilla/*.src.js  ── Bun.build (minify, resolve uhtml) ──►  *.js
         │
         └── also emit React wrappers + custom-elements.json
```

1. **`defineComponent`** is a typed identity function — it returns your config object as-is.
2. **`kitbash build`** loads each file under `src/components/`, reads `export default`.
3. The compiler **stringifies** `render` and `events` handlers and stitches them into a custom element class.
4. Styles (plus flattened tokens) become a **constructable `CSSStyleSheet`** on the shadow root.
5. **`Bun.build`** bundles `uhtml` into the vanilla artifact so consumers don’t depend on it.
6. React wrappers re-export the vanilla CE and bridge `kitbash-change` / `click`.

### Runtime model (generated element)

| Concern | Behavior |
|---------|----------|
| Props | Reflected as attributes; `String` / `Number` / `Boolean` coercion |
| State | Internal `_state` |
| Updates | `commit({ props?, state? })` — **one** re-render + **one** `kitbash-change`. `setProps` / `setState` are thin wrappers around `commit`. |
| Re-render | `uhtml` `render()` into `shadowRoot` |
| Events | Selectors like `'click button'` or `'input input'`; handlers receive `{ props, state, commit, setProps, setState }` |
| Change event | User-driven `commit` / `setProps` / `setState` only (not external `el.value = …` from the parent) |
| Forms | If `formAssociated`, `ElementInternals` + `setFormValue` on `value`; basic validity for `required` / `invalid` |

### Why uhtml v4?

The compiler pins **`uhtml@4.7.1`**. v5’s signal rewrite and some conditional-array behaviors were intentionally avoided for predictable Shadow DOM updates. Don’t casually bump this dependency in forks without re-testing input focus and list rendering.

---

## Authoring API

```ts
import { defineComponent, type ComponentConfig } from '@ktbsh/sdk';

export default defineComponent({
  tag: 'my-element',           // required custom element tag
  formAssociated?: boolean,    // ElementInternals + form value sync for `value`
  delegatesFocus?: boolean,    // attachShadow({ delegatesFocus })
  props?: {
    name: { type: String | Number | Boolean, default: unknown }
  },
  state?: Record<string, unknown>,
  styles?: string,             // CSS injected into constructable stylesheet
  events?: {
    // key: "eventName" or "eventName css-selector"
    'click button'(e, { commit, setState }) { /* … */ }
  },
  render({ props, state, commit, setProps, setState, html }) {
    return html`…`;           // uhtml template (html tagged template)
  },
});
```

### Props

- Declared props become getters/setters and `observedAttributes`.
- **Boolean:** presence of the attribute (or `true`) → `true`; missing / `"false"` → falsey handling as in the generated code.
- **Number:** attribute strings are coerced with `Number(...)`.
- Defaults apply when the attribute is removed.
- **External** writes (`el.value = 'x'` or React `value={…}`) re-render but **do not** fire `kitbash-change` (the parent already knows).

### `commit` / `setProps` / `setState` (fast path)

| API | Use for |
|-----|---------|
| **`commit({ props?, state? })`** | Preferred — batch props + state in **one** update and **one** `kitbash-change` |
| **`setProps({ … })`** | Props only (wrapper around `commit`) |
| **`setState({ … })`** | UI state only — open/hover/touched (wrapper around `commit`) |

Controlled input (scaffold pattern):

```ts
events: {
  'input input'(e, { commit }) {
    const t = e.target as HTMLInputElement;
    commit({
      props: { value: t.value },
      state: { touched: true },
    });
  },
},
```

Consumers read **`e.detail.props.value`** (and `e.detail.state`) on `kitbash-change` / React `onKitbashChange`.

### Events map

Keys are space-separated: **`eventName`** optional **`selector`**.

```ts
events: {
  'input input'(e, { commit }) {
    commit({ props: { value: (e.target as HTMLInputElement).value } });
  },
}
```

Handlers are re-bound after every update (previous listeners cleaned up). Prefer stable selectors.

### Slots

Use standard `<slot>` in your template. React wrappers pass `children` into the custom element’s light DOM so the browser projects them into slots.

```ts
render({ html }) {
  return html`<button part="button-root"><slot></slot></button>`;
}
```

### Theming

**1. CSS variables on `:host`** (in component `styles`):

```css
:host {
  --kitbash-btn-bg: #0070f3;
}
button { background: var(--kitbash-btn-bg); }
```

Consumers override from the outside:

```css
my-button {
  --kitbash-btn-bg: rebeccapurple;
}
```

**2. Shadow parts** for deeper styling:

```html
<button part="button-root">…</button>
```

```css
my-button::part(button-root) {
  text-transform: uppercase;
}
```

**3. Design tokens file** — optional `src/tokens.json`:

```json
{
  "colors": { "primary": "#0070f3" },
  "spacing": { "md": "16px" }
}
```

Flattened into `:host` variables, e.g. `--colors-primary`, `--spacing-md`, and prepended to every component’s stylesheet at compile time.

### Form-associated components

```ts
export default defineComponent({
  tag: 'kitbash-input',
  formAssociated: true,
  delegatesFocus: true,
  props: {
    name: { type: String, default: '' },
    value: { type: String, default: '' },
    required: { type: Boolean, default: false },
    invalid: { type: Boolean, default: false },
  },
  events: {
    'input input'(e, { commit }) {
      commit({ props: { value: (e.target as HTMLInputElement).value } });
    },
  },
  // …
});
```

Generated behavior includes:

- `static formAssociated = true`
- `attachInternals()` and `setFormValue` when `value` is assigned (via `commit` / `setProps` / property)
- Basic `setValidity` for `required` / `invalid` props

**SDK vs design system:** Kitbash wires platform form participation and focus delegation. Labels, error copy, live regions, and full WCAG product patterns belong in **your** design system components — not the compiler.

### React wrapper contract

| Prop / event | Meaning |
|--------------|---------|
| Declared props | Passed through to the custom element |
| `children` | Light DOM → slots |
| `onClick` (and other native DOM handlers) | Forwarded on the host — React 19 binds them (not double-wrapped) |
| `onKitbashChange` | Bridges custom `kitbash-change` (`e.detail.props` / `e.detail.state`) |
| `ref` | Callback refs and `RefObject` both supported |

---

## CLI reference

```text
kitbash init <project-name>   Scaffold templates/default into a new folder
kitbash build                 Compile src/components → dist/
kitbash                       Print help
```

| Command | Notes |
|---------|--------|
| `init` | Project name must be a single path segment (no `..` / nested paths). Refuses if the directory exists. Rewrites `workspace:*` SDK deps to the published version. |
| `build` | Always reads `src/components` and writes `dist/` under `process.cwd()`. |

Add a script in your design-system `package.json`:

```json
{
  "scripts": {
    "build": "kitbash build"
  },
  "dependencies": {
    "@ktbsh/sdk": "^0.1.1"
  }
}
```

---

## Project layout conventions

These paths are **fixed by the compiler today** (not fully driven by `kitbash.config.ts` yet):

| Path | Role |
|------|------|
| `src/components/*.ts` | One default-exported component per file |
| `src/tokens.json` | Optional design tokens |
| `dist/` | Build output |

`kitbash.config.ts` is scaffolded for forward compatibility (`frameworks`, `tokens`, `outDir`) but **is not read by the compiler in 0.1.x**. Changing it will not change build behavior yet.

---

## Packaging your design system

After `kitbash build`, publish *your* package (not the SDK) with something like:

```json
{
  "name": "@you/ui",
  "type": "module",
  "exports": {
    "./vanilla/*": "./dist/vanilla/*",
    "./react/*": "./dist/react/*",
    "./custom-elements.json": "./dist/custom-elements.json"
  },
  "files": ["dist"]
}
```

Consumers then:

```ts
import '@you/ui/vanilla/button.js';
// or
import { MyButton } from '@you/ui/react/button.js';
```

Point VS Code / CEM tooling at `custom-elements.json` for tag autocomplete where supported.

---

## Troubleshooting

### `kitbash: command not found`

- Install with Bun: `bun add -g @ktbsh/sdk`, or use `bunx @ktbsh/sdk …`
- Ensure the Bun global bin directory is on your `PATH`

### Build fails / empty output

- Run from the project root (the folder that contains `src/components`)
- Each component file must `export default defineComponent({ tag: '…', … })`
- Only `.ts` / `.js` files in `src/components` are compiled
- Missing `src/components` → warning and no output (exit still succeeds)

### “No valid default ComponentConfig”

- Default export must include a `tag` string
- Avoid named-only exports without `export default`

### Attribute / prop not updating the UI

- Prop must be listed under `props` (so it is observed)
- Prefer setting the **property** from JS (`el.value = 'x'`) when types matter; Booleans are special-cased
- Confirm your `render` reads `props.*` (not a closed-over stale value)

### Input loses focus or value on each keystroke

- Prefer uhtml property binding: `.value=${props.value}` (as in the scaffold)
- Avoid replacing the whole input via unstable keys or recreating nodes unnecessarily
- Do not upgrade the SDK’s `uhtml` pin without testing this path

### Form submit does not include the field

- Set `formAssociated: true`
- Keep a `value` prop and update it on input (property + `setFormValue`)
- Ensure the control has a `name` attribute/prop if you use `FormData`

### React: `onKitbashChange` never fires

- It only fires when **`commit` / `setProps` / `setState`** run inside the component (not when React sets `value={…}` from outside)
- For controlled inputs use `commit({ props: { value } })` in the `input` handler (see scaffold `input.ts`), then `onKitbashChange={(e) => setVal(e.detail.props.value)}`

### React types / JSX unknown tag

- Import the generated `*.d.ts` side (or the wrapper module) so the JSX `IntrinsicElements` augmentation loads
- Use React 19-friendly tooling; wrappers target modern React

### Styles don’t apply from the parent page

- Shadow DOM encapsulates plain element selectors — use **CSS variables** or **`::part(...)`**
- Tokens only apply if `src/tokens.json` exists and parses as JSON at build time

### `tokens.json` ignored

- Path must be exactly `src/tokens.json` relative to the project you build
- Invalid JSON logs a warning and continues without tokens

### Init: “Directory already exists” / invalid name

- Pick a new folder name; only a single directory segment is allowed (`my-ds`, not `../my-ds`)

### Using with Vite / other bundlers

- Import **built** `dist/vanilla/*.js` or `dist/react/*.js` from the app — don’t point the app at raw Kitbash component sources unless you know Bun/TS evaluation is available
- Vanilla files are already browser-minified bundles; React wrappers still import `react` and the sibling vanilla module

---

## Known limitations (0.1.x)

Be aware of these before relying on Kitbash in production:

1. **`kitbash.config.ts` is not wired up** — paths and targets are hardcoded.
2. **No dedicated Svelte/Vue wrappers** — use vanilla custom elements.
3. **Event map rebinds every update** — fine for small trees; measure if you bind many nodes.
4. **CEM is minimal** — tags/attributes only; no slots/events/CSS parts documentation yet.
5. **Form validity is basic** — `required` / `invalid` only; no full constraint validation API surface. Product a11y (labels, announcements) is design-system work.
6. **Function serialization** — `render` / `events` are `.toString()`’d into the output. Closures over imports or outer locals will **not** work; keep handlers self-contained or use only `props` / `state` / `commit` / `setProps` / `setState` / DOM APIs.
7. **Bun-only toolchain** — Node is not a supported host for the CLI today.

---

## Ideas for improvement

Contributions and experiments welcome. High-value directions:

| Idea | Why |
|------|-----|
| **Watch mode** (`kitbash dev`) | Faster authoring loop with rebuild on save |
| **Honor `kitbash.config.ts` or stop shipping it as live config** | Honesty: file is ignored today |
| **Svelte / Vue wrapper codegen** | First-class DX beyond vanilla tags |
| **Richer CEM** | Events, slots, CSS parts/properties for docs tools |
| **Stable public runtime helpers** | Shared utilities without relying on serialized closures |
| **CSS / token pipeline** | Themes, dark mode maps, reference to CSS files |
| **Source maps & better errors** | Map compile failures back to authoring files |
| **Node-compatible CLI build** | Wider install story if Bun-only is a blocker |
| **Broader compiler snapshots** | Expand beyond form/change + runtime contract tests |
| **`exports` map in scaffold** | Publish-ready package.json from `init` |
| **Strip or gitignore `*.src.js`** | Cleaner publish artifacts |

**Done recently:** controlled input via `commit` + React bridge + event detail snapshots + contract tests (see changelog / recent commits).

If you try Kitbash on a real system, issues and “this surprised me” notes are especially useful — early APIs should bend toward real workflows.

---

## Development (this monorepo)

If you are hacking on the SDK itself (not only consuming it from npm):

```bash
# from repo root
bun install
bun run --filter @ktbsh/sdk build   # or: cd packages/sdk && bun run build
```

- Compiler: `packages/sdk/src/compiler.ts`
- CLI: `packages/sdk/src/cli.ts`
- Public API: `packages/sdk/src/index.ts` (`defineComponent`)
- Template copied by `init`: `packages/sdk/templates/default`
- Playground: `/sandbox` (React, Svelte, Vanilla side by side against `templates/default/dist`)

---

## Versioning

Current line: **0.1.x** — expect breaking changes while the compiler and authoring API settle. Pin versions in apps (`"@ktbsh/sdk": "0.1.1"`) if you need stability.

---

## License

MIT

---

## Links

- npm: [`@ktbsh/sdk`](https://www.npmjs.com/package/@ktbsh/sdk)
- Repository: [github.com/kitbash/sdk](https://github.com/kitbash/sdk)
