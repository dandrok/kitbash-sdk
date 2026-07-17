#!/usr/bin/env bun
import { existsSync, type FSWatcher, watch } from 'node:fs';
import { basename, dirname, resolve, sep } from 'node:path';
import { compileComponents } from '../packages/sdk/src/compiler.js';
import {
  type KitbashProjectConfig,
  loadProjectConfig,
} from '../packages/sdk/src/config.js';

const projectDir = resolve(import.meta.dir, '../templates/default');

let building = false;
let queued = false;
let timer: ReturnType<typeof setTimeout> | null = null;
const watchers: FSWatcher[] = [];

function clearWatchers() {
  for (const w of watchers) {
    try {
      w.close();
    } catch {
      // ignore
    }
  }
  watchers.length = 0;
}

function nearestExisting(path: string): string | null {
  let cur = path;
  for (let i = 0; i < 32; i++) {
    if (existsSync(cur)) return cur;
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return null;
}

function isUnderOutDir(cfg: KitbashProjectConfig, absFile: string) {
  const out = cfg.outDir.endsWith(sep) ? cfg.outDir : cfg.outDir + sep;
  return absFile === cfg.outDir || absFile.startsWith(out);
}

function watchPath(
  path: string,
  opts: { recursive?: boolean },
  onEvent: (filename: string | null) => void,
) {
  if (!existsSync(path)) return;
  try {
    const w = watch(path, opts, (_event, filename) => {
      onEvent(filename?.toString() ?? null);
    });
    w.on('error', (err) => {
      console.warn(`⚠️ Watcher error (${path}):`, err);
    });
    watchers.push(w);
  } catch (err) {
    console.warn(`⚠️ Could not watch ${path}:`, err);
  }
}

function watchPathOrAncestor(
  target: string,
  opts: { recursive?: boolean },
  onEvent: (filename: string | null) => void,
  onMaybeCreated: () => void,
) {
  if (existsSync(target)) {
    watchPath(target, opts, onEvent);
    return;
  }
  const ancestor = nearestExisting(dirname(target));
  if (!ancestor) return;
  watchPath(ancestor, { recursive: true }, () => {
    if (existsSync(target)) onMaybeCreated();
  });
}

async function attachWatchers() {
  clearWatchers();
  const cfg = await loadProjectConfig(projectDir);

  watchPathOrAncestor(
    cfg.componentsDir,
    { recursive: true },
    (name) => {
      if (!name || !(name.endsWith('.ts') || name.endsWith('.js'))) return;
      const abs = resolve(cfg.componentsDir, name);
      if (isUnderOutDir(cfg, abs)) return;
      schedule(`components ${name}`);
    },
    () => schedule('components-dir-created'),
  );

  watchPathOrAncestor(
    cfg.tokensFile,
    {},
    () => schedule(`tokens ${basename(cfg.tokensFile)}`),
    () => schedule('tokens-file-created'),
  );

  for (const name of ['kitbash.config.ts', 'kitbash.config.js'] as const) {
    watchPathOrAncestor(
      resolve(projectDir, name),
      {},
      () => schedule(name),
      () => schedule(`${name}-created`),
    );
  }

  console.log(
    `\n👀 Watching ${cfg.componentsDir} (+ tokens/config when present)…`,
  );
}

function schedule(reason: string) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void build(reason);
  }, 80);
}

async function build(reason = 'rebuild') {
  if (building) {
    queued = true;
    return;
  }
  building = true;
  console.log(`\n🛠️ Rebuilding components (${reason})...`);
  try {
    const latest = await loadProjectConfig(projectDir);
    await compileComponents(projectDir, latest.outDir, {
      componentsDir: latest.componentsDir,
      tokensFile: latest.tokensFile,
      warnIfTokensMissing: latest.tokensConfigured,
    });
    console.log('✅ Build complete!');
  } catch (e) {
    console.error('❌ Build error:', e);
  } finally {
    try {
      await attachWatchers();
    } catch (e) {
      console.warn('⚠️ Could not refresh watchers:', e);
    }
    building = false;
    if (queued) {
      queued = false;
      schedule('queued');
    }
  }
}

// Sticky project-root watch so creating kitbash.config.ts still triggers recovery
try {
  const rootWatch = watch(projectDir, (_event, filename) => {
    const name = filename?.toString() ?? '';
    if (name === 'kitbash.config.ts' || name === 'kitbash.config.js') {
      schedule(`config ${name}`);
    }
  });
  rootWatch.on('error', (err) => {
    console.warn('⚠️ Project root watcher error:', err);
  });
} catch (err) {
  console.warn('⚠️ Could not watch project root for config:', err);
}

await build('initial');

const _viteProcess = Bun.spawn(['bun', 'run', 'vite'], {
  cwd: resolve(import.meta.dir, '../sandbox'),
  stdio: ['inherit', 'inherit', 'inherit'],
});

console.log('\n🚀 Dev server running on http://localhost:3000\n');
