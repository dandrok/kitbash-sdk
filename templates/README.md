# Templates (workspace)

In-repo **fixtures** used while developing Kitbash — not the same copy path as `kitbash init` for npm users.

| Path | Purpose |
|------|---------|
| [`default/`](./default/) | Sample design system the **sandbox** and `bun run dev` compile and import |
| [`../packages/sdk/templates/default`](../packages/sdk/templates/default/) | Scaffold **copied by `kitbash init`** into new projects |

Edit the workspace fixture first (`default/`), then run `bun run build` in `packages/sdk` to re-embed the scaffold. The package build overwrites scaffold sources under `packages/sdk/templates/default` but keeps that folder’s user-facing `README.md` separate from this monorepo fixture’s docs.

Details for the workspace fixture: [default/README.md](./default/README.md).
