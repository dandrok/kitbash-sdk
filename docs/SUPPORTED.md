# Kitbash supported surface (0.1.x)

Living contract for what `@ktbsh/sdk` **is** and **is not**.  
Full authoring docs: [`packages/sdk/README.md`](../packages/sdk/README.md).  
Backlog from audits: [`docs/improvements/`](./improvements/).

## What the SDK is

A **compiler + authoring API** for design-system components:

1. Author with `defineComponent({ … })` in TypeScript  
2. `kitbash build` loads each file under the **fixed** path `src/components` (it does **not** read `kitbash.config.ts` in 0.1.x) and emits:
   - Vanilla custom elements (Shadow DOM, uhtml v4, tokens/parts)
   - React wrappers (`onKitbashChange`, native props/handlers)
   - Minimal `custom-elements.json`
3. Consume in **Vanilla**, **React**, or **Svelte** (import vanilla CE)

It is **not** a finished design system (no official button kit, themes, or product a11y content).

## Supported today

| Area | Support |
|------|---------|
| Runtime | Bun ≥ 1.0 CLI/compiler |
| Authoring | `defineComponent`, props (String/Number/Boolean), state, styles, events map, render |
| Updates | `commit({ props?, state? })`, `setProps`, `setState` → one render + `kitbash-change` |
| Forms (platform) | `formAssociated`, `delegatesFocus`, `setFormValue` on `value`, basic `required`/`invalid` validity |
| Theming hooks | CSS variables on `:host`, `part`, optional `src/tokens.json` → CSS vars |
| Slots | Standard HTML slots; React `children` → light DOM |
| Outputs | `dist/vanilla/*`, `dist/react/*`, `dist/custom-elements.json` |
| Paths | Fixed: `src/components` → `dist/` (cwd) |
| Frameworks | Vanilla + React codegen; Svelte via vanilla tags |
| Tests | Compiler source contract tests + runtime CE contract tests (happy-dom) + monorepo smoke (`init` + fixture build) |

## Explicit non-goals (for now)

| Non-goal | Notes |
|----------|--------|
| Full design-system UI | Belongs in a future package/repo (e.g. kitbash-ui) |
| Product a11y content | Labels, error copy, live regions = DS components |
| Svelte/Vue generated wrappers | Use vanilla CE |
| Reading `kitbash.config.ts` | Scaffolded only; **ignored** by compiler |
| Watch mode in published CLI | Monorepo has `bun run dev`; no `kitbash dev` yet |
| Object/array props as attributes | Primitives only reflected to attributes |
| Node-hosted CLI | Bun-only |

## Hard rules (agents & humans)

1. **No closures** in `render` / `events` over imports or outer locals (`.toString()` serialization).  
2. Prefer **`commit`** for user input so `e.detail.props` is fresh.  
3. External `el.value = x` / React `value={x}` does **not** fire `kitbash-change`.  
4. Edit **root** `templates/default` for scaffolds; package embed is regenerated on SDK build (init README preserved).  
5. Keep **uhtml@4.7.1**.

## Verify after changes

```bash
bun run test:sdk
bun run ci
bun run smoke   # optional full path
# if runtime emit changed:
cd templates/default && bun ../../packages/sdk/dist/cli.js build
```

Sandbox: Vanilla / React / Svelte under `sandbox/` against `templates/default/dist`.
