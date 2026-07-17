#!/usr/bin/env bun
import { existsSync, type FSWatcher, watch } from 'node:fs';
import { basename, resolve } from 'node:path';
import { compileComponents } from '../packages/sdk/src/compiler.js';
import { loadProjectConfig } from '../packages/sdk/src/config.js';

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

function watchPath(
  path: string,
  opts: { recursive?: boolean },
  onEvent: () => void,
) {
  if (!existsSync(path)) return;
  try {
    const w = watch(path, opts, () => onEvent());
    w.on('error', (err) => {
      console.warn(`⚠️ Watcher error (${path}):`, err);
    });
    watchers.push(w);
  } catch (err) {
    console.warn(`⚠️ Could not watch ${path}:`, err);
  }
}

async function attachWatchers() {
  clearWatchers();
  const cfg = await loadProjectConfig(projectDir);

  if (existsSync(cfg.componentsDir)) {
    watchPath(cfg.componentsDir, { recursive: true }, () => {
      schedule('components');
    });
  }
  if (existsSync(cfg.tokensFile)) {
    watchPath(cfg.tokensFile, {}, () => {
      schedule(`tokens ${basename(cfg.tokensFile)}`);
    });
  }
  for (const name of ['kitbash.config.ts', 'kitbash.config.js'] as const) {
    watchPath(resolve(projectDir, name), {}, () => schedule(name));
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

// Start Vite sandbox
const _viteProcess = Bun.spawn(['bun', 'run', 'vite'], {
  cwd: resolve(import.meta.dir, '../sandbox'),
  stdio: ['inherit', 'inherit', 'inherit'],
});

console.log('\n🚀 Dev server running on http://localhost:3000\n');
