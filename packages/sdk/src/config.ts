import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Resolved paths for one kitbash build (always absolute). */
export interface KitbashProjectConfig {
  /** Absolute path to components directory */
  componentsDir: string;
  /** Absolute path to tokens JSON (may not exist) */
  tokensFile: string;
  /** Absolute output directory */
  outDir: string;
  /** Raw fields from kitbash.config (for logging) */
  source: 'defaults' | 'kitbash.config.ts' | 'kitbash.config.js';
}

const DEFAULTS = {
  components: 'src/components',
  tokens: 'src/tokens.json',
  outDir: 'dist',
} as const;

function resolveFromProject(projectDir: string, p: string): string {
  return isAbsolute(p) ? p : resolve(projectDir, p);
}

/**
 * Load optional kitbash.config.{ts,js} from projectDir.
 * Supported keys (relative paths resolved against projectDir):
 *   - components (default: src/components)
 *   - tokens (default: src/tokens.json)
 *   - outDir (default: dist)
 *
 * Unknown keys (e.g. frameworks) are ignored with a one-line note.
 */
export async function loadProjectConfig(
  projectDir: string,
): Promise<KitbashProjectConfig> {
  const candidates = ['kitbash.config.ts', 'kitbash.config.js'] as const;
  let raw: Record<string, unknown> = {};
  let source: KitbashProjectConfig['source'] = 'defaults';

  for (const name of candidates) {
    const path = resolve(projectDir, name);
    if (!existsSync(path)) continue;
    try {
      // file URL + cache bust: Windows-safe + pick up config edits in watch mode
      const href = `${pathToFileURL(path).href}?t=${Date.now()}`;
      const mod = await import(href);
      const cfg = (mod.default ?? mod) as Record<string, unknown>;
      if (cfg && typeof cfg === 'object') {
        raw = cfg;
        source = name as KitbashProjectConfig['source'];
      }
    } catch (err) {
      // Fail hard — do not silently fall back to default paths with a broken config
      throw new Error(
        `Failed to load ${name}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    break;
  }

  const known = new Set(['components', 'tokens', 'outDir', 'frameworks']);
  const unknown = Object.keys(raw).filter((k) => !known.has(k));
  if (unknown.length > 0) {
    console.warn(
      `⚠️ kitbash.config: ignoring unknown keys: ${unknown.join(', ')}`,
    );
  }
  if (raw.frameworks !== undefined) {
    console.log(
      'ℹ️ kitbash.config frameworks is reserved (0.1.x always emits vanilla + react)',
    );
  }

  const componentsRel =
    typeof raw.components === 'string' ? raw.components : DEFAULTS.components;
  const tokensRel =
    typeof raw.tokens === 'string' ? raw.tokens : DEFAULTS.tokens;
  const outDirRel =
    typeof raw.outDir === 'string' ? raw.outDir : DEFAULTS.outDir;

  return {
    componentsDir: resolveFromProject(projectDir, componentsRel),
    tokensFile: resolveFromProject(projectDir, tokensRel),
    outDir: resolveFromProject(projectDir, outDirRel),
    source,
  };
}
