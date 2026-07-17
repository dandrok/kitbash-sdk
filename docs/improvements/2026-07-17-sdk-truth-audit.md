# SDK truth audit — 2026-07-17

**Scope:** `packages/sdk` README + CLI/compiler vs real behavior.  
**Goal:** list holes without implementing everything in one PR.

## Legend

| Status | Meaning |
|--------|---------|
| **ok** | Docs match code |
| **doc** | Code OK; docs need tweak |
| **code** | Behavior should improve |
| **product** | Intentional non-goal / design-system later |

---

## Findings

### ok — recently fixed (commit form contract)

- [x] Controlled input / `kitbash-change` with fresh props via `commit`
- [x] Event detail shallow-copies `props` and `state`
- [x] React: no double `onClick`; `onKitbashChange` for custom event only
- [x] `_reflecting` avoids double update on attribute reflection
- [x] Primitive-only attribute reflection
- [x] Contract tests in `compiler.contract.test.ts`

### doc — config file still looks real

- Scaffold ships `kitbash.config.ts` with `frameworks` / `tokens` / `outDir`
- Compiler **never reads it** (hardcoded `src/components`, `src/tokens.json`, `dist/`)
- README already warns; config file itself should scream “not read”
- **Action:** comment banner in template `kitbash.config.ts` (+ package embed via sync)

### doc — ideas table partially stale

- “Controlled input recipe” and “unit tests around compiler output” are partly done
- **Action:** mark done / rephrase in SDK README ideas table

### code — high value next (SDK tool, not DS)

| Priority | Item | Why |
|----------|------|-----|
| P1 | Loud serialization rule + example that fails if closed over | Top agent footgun |
| P1 | Either wire minimal `kitbash.config` **or** stop shipping it as active config | Honesty |
| P2 | `kitbash dev` (or document monorepo `bun run dev` as official) | DX loop |
| P2 | Event delegation once (not rebind every update) | Perf on heavy trees |
| P2 | Richer CEM (events, slots, parts) | Docs/IDE |
| P3 | Strip `*.src.js` from publish defaults | Clean artifacts |
| P3 | Scaffold `exports` map | Publishable DS packages |

### product — not SDK work

- Full WCAG component set, labels, error strings, themes as product
- Official component library (`kitbash-ui`) in separate repo later
- Svelte-specific wrappers (vanilla CE is enough for 0.1)

### ok — documented limitations still true

- No Svelte/Vue wrappers
- Event map rebinds each update
- CEM minimal
- Form validity basic
- Bun-only CLI
- Fixed paths without real config

---

## Recommended next loops (order)

1. **This audit loop:** doc fixes only (config banner, ideas table, link SUPPORTED.md) — no compiler churn  
2. ~~**Runtime contract tests** (CR): load generated CE and assert `commit` + `kitbash-change`~~ → **done** (`runtime.contract.test.ts` via happy-dom + uhtml mock)
3. **Serialization hard-doc + tiny contract test** if we can assert “don’t close over” via docs + example  
4. **Config honesty:** wire *or* rename to `kitbash.config.example.ts`  
5. **Watch / dev story**  
6. Broader snapshots  

## Out of scope for audit file

Skill/MCP (Phase 2–3) — after supported surface stays stable for a few loops.
