# Modal component (template fixture) — Design

**Date:** 2026-07-18  
**Status:** Approved (conversation)  
**Scope:** Design-system fixture only — not an SDK/compiler change

## Goal

Add a simple `kitbash-modal` sample component under `templates/default`, controlled by a boolean `open` prop, with body content provided via slot. Sandboxes (Vanilla / React / Svelte) demonstrate open/close and an alert action by composing existing `my-button` (and plain triggers where useful).

## Non-goals

- Focus trap, Escape-to-close, scroll lock, body portal
- Backdrop-click close (v1)
- Native `<dialog>` / `showModal()`
- Product a11y content beyond a basic panel structure
- SDK compiler, runtime, or package API changes
- Nested modal stacking

## Approach

**Controlled overlay modal (Approach 1):** host visibility toggled by `open` prop; backdrop + panel chrome in the component; default slot for body. Parents own open state; close/alert buttons live in sandbox light DOM, not hard-coded in the modal.

## Component API

**File:** `templates/default/src/components/modal.ts`  
**Tag:** `kitbash-modal`

| Prop | Type | Default | Behavior |
|------|------|---------|----------|
| `open` | Boolean | `false` | When false, hide host (`display: none` or equivalent). When true, show overlay. |
| `title` | String | `''` | If non-empty, render a heading in the panel; if empty, omit heading. |

**State:** none  
**Events (component-authored):** none required for v1. Open is set only from the outside; no internal `commit` for close.  
**Slots:** default `<slot>` for panel body (buttons, copy, etc.).  
**Parts:** `modal-backdrop`, `modal-panel` (and optionally `modal-title`) for theming.  
**Styles:** CSS custom properties on `:host` for z-index, backdrop color, panel radius/padding/background — same pattern as `button.ts` / `input.ts`.

### Render sketch (authoring intent)

```
:host[hidden or not open] → display: none (or :host(:not([open])) display: none)
backdrop part
panel part
  h2 title (if title)
  <slot>
```

Authoring must obey SDK rules: no outer closures/imports inside `render` / `events`; use `defineComponent` only.

## Composition in sandboxes

Each of:

- `sandbox/vanilla/index.html`
- `sandbox/react/main.tsx`
- `sandbox/svelte/App.svelte`

will:

1. Import compiled modal + existing button (and keep existing demos).
2. Own an `open` flag (attribute / React `useState` / Svelte `$state`).
3. Provide an “Open modal” control that sets `open` true.
4. Place inside the modal:
   - `my-button` (or equivalent) that sets `open` false
   - control that calls `alert(...)` (can be `my-button` or native button)

## Build & package path

1. Edit **root** `templates/default/src/components/modal.ts` only for the component source (per AGENTS.md: root template is the scaffold source of truth for local DS work).
2. Rebuild fixture:

   ```bash
   cd templates/default && bun ../../packages/sdk/dist/cli.js build
   ```

3. Sandbox imports from `templates/default/dist/…`.
4. Optional same loop: ensure package embed template stays in sync when SDK build copies templates (`packages/sdk/templates/default`) — if monorepo practice is “root only + SDK build regenerates embed”, follow existing convention; do not invent a second divergent modal source.

## Verify

- Rebuild produces `dist/vanilla/modal.js` and `dist/react/modal.js` (+ `.d.ts`).
- Manual check: open modal, close via button, alert fires — Vanilla, React, Svelte.
- No change expected to `bun run test:sdk` contracts unless something else is touched; still run `bun run test:sdk` and `bun run ci` if any shared code is edited (expected: not).

## Success criteria

- [ ] `kitbash-modal` exists and builds like button/input
- [ ] `open` boolean controls visibility
- [ ] Slot hosts sandbox-provided close + alert actions
- [ ] All three sandboxes demonstrate the flow
- [ ] No SDK compiler/runtime changes
