# Default template (workspace fixture)

Sample design system used **inside this monorepo** to exercise the compiler and power the [sandbox](../../sandbox).

When you run `bun run dev` from the repo root, [`scripts/dev.ts`](../../scripts/dev.ts) points at this folder:

- **Input:** `src/components/*.ts`, optional `src/tokens.json`
- **Output:** `dist/` (vanilla, react, `custom-elements.json`)
- **Consumers:** sandbox demos import from `templates/default/dist/...`

---

## Layout

```text
templates/default/
├── kitbash.config.ts   # reserved; not read by compiler in 0.1.x
├── package.json        # "build": "kitbash build", depends on @ktbsh/sdk
├── src/
│   ├── tokens.json     # → CSS variables on :host at compile time
│   └── components/
│       ├── button.ts   # <my-button> — slots, variants, state
│       └── input.ts    # <kitbash-input> — formAssociated example
└── dist/               # generated (git may or may not track; rebuild locally)
```

---

## Build

From this directory (with workspace install done at repo root):

```bash
bun run build
# → kitbash build → dist/
```

Or from repo root via the dev script (build + watch + sandbox):

```bash
bun run dev
```

---

## Relationship to `kitbash init`

| | This folder (`templates/default`) | `packages/sdk/templates/default` |
|--|-----------------------------------|----------------------------------|
| Used by | Sandbox, monorepo dev loop | `kitbash init <name>` for users |
| SDK dependency | Often `workspace:*` | Rewritten to a semver range on init |
| `dist/` | Expected after local builds | Not shipped; users run `bun run build` |

When you improve the starter components or tokens, update **both** trees so init users and the sandbox stay consistent.

---

## Authoring rules (same as any Kitbash project)

- One component file → `export default defineComponent({ tag: '…', … })`
- Paths are fixed today: `src/components` → `dist/`
- Keep `render` / `events` free of outer closures (they are serialized into output)

Full API and troubleshooting: [packages/sdk/README.md](../../packages/sdk/README.md).
