# Sandbox

Local multi-framework playground for Kitbash components. Used while developing the SDK and the sample design system — not published to npm.

It runs three demos side by side against the **compiled** output of [`templates/default`](../templates/default):

| Route | Stack | How it consumes components |
|-------|--------|----------------------------|
| `/vanilla/` | Plain HTML + ES modules | `import …/templates/default/dist/vanilla/*.js` |
| `/react/` | React 19 + Vite | Generated wrappers from `dist/react/*` |
| `/svelte/` | Svelte 5 | Vanilla custom elements from `dist/vanilla/*` |

---

## Quick start (from repo root)

Preferred: one command that rebuilds components, watches sources, and starts Vite:

```bash
bun install          # once, from repo root
bun run dev
```

Then open [http://localhost:3000](http://localhost:3000).

`bun run dev` runs [`scripts/dev.ts`](../scripts/dev.ts), which:

1. Compiles `templates/default/src/components` → `templates/default/dist`
2. Watches those sources and recompiles on change
3. Starts this sandbox’s Vite server on port **3000**

### Sandbox only (components already built)

```bash
cd templates/default && bunx kitbash build   # or use workspace SDK compiler
cd ../../sandbox && bun run dev              # "vite" via package.json
```

If `templates/default/dist` is missing or stale, demos will fail to import.

---

## Layout

```text
sandbox/
├── index.html          # hub links to the three demos
├── vite.config.ts      # multi-page app + fs.allow for monorepo imports
├── package.json
├── vanilla/index.html
├── react/
│   ├── index.html
│   └── main.tsx
└── svelte/
    ├── index.html
    ├── main.ts
    └── App.svelte
```

Vite is configured as a multi-page app (`main`, `vanilla`, `react`, `svelte`).  
`server.fs.allow` includes the parent monorepo so demos can import `../templates/default/dist/...`.

---

## Stack (pinned via workspace)

- **Vite 8** — dev server / playground bundling  
- **React 19** — JSX wrappers demo  
- **Svelte 5** — runes + vanilla custom elements  

See root [`AGENTS.md`](../AGENTS.md) for pin policy (including **uhtml v4** in the SDK, not here).

---

## Workflow tips

| Goal | What to do |
|------|------------|
| Change a component | Edit `templates/default/src/components/*.ts`, save; `bun run dev` rebuilds `dist/` |
| Change playground UI | Edit files under `sandbox/react`, `sandbox/svelte`, or `sandbox/vanilla` |
| Test a new component | Add `src/components/foo.ts` under the default template, rebuild, import it in a demo |
| SDK compiler change | Rebuild/use `packages/sdk` sources; restart `bun run dev` if the watcher already loaded old code |

Hard-refresh the browser if HMR doesn’t pick up a newly generated `dist` file.

---

## Not for production

This folder is a **dev harness**. Do not treat it as an app template or ship it. For a real design system, use:

```bash
bunx @ktbsh/sdk init my-design-system
```

Docs: [packages/sdk/README.md](../packages/sdk/README.md).
