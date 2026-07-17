# SDK truth audit — 2026-07-17 (updated)

**Scope:** `packages/sdk` vs real behavior.  
**Full contract:** [`docs/SUPPORTED.md`](../SUPPORTED.md).

## Resolved on this branch

| Item | Notes |
|------|--------|
| `commit` / `setProps` / `setState` | One re-render + `kitbash-change`; form input scaffold |
| Event detail / handler ctx | Shallow snapshots (nested objects still shared — documented) |
| Config load | `components`, `tokens`, `outDir`; fail if config file exists but cannot load |
| Serialization hard rule | Documented no outer closures |
| Runtime + compiler contract tests | Source emit + happy-dom CE (uhtml mocked) |
| `kitbash dev` | Debounced watch; rebind paths; sticky config watch; watcher errors |
| Monorepo `scripts/dev.ts` | Same path/config rebind idea for sandbox |

## Still open / known tradeoffs

| Priority | Item |
|----------|------|
| P2 | Playwright / real browser on **minified** vanilla (real uhtml) |
| P2 | Dev ESM `?t=` only busts entry modules — transitive imports may stay cached |
| P3 | Strip `*.src.js` from consumer publish artifacts |
| P3 | Event delegation (no rebind every update) |
| P3 | Richer CEM; `frameworks` toggles |

## CodeRabbit (latest full branch)

Re-run anytime with:

```bash
cr review --plain --base main
```
