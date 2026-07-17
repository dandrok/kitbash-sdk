#!/usr/bin/env bun
import { watch } from 'node:fs';
import { resolve } from 'node:path';
import { compileComponents } from '../packages/sdk/src/compiler.js';
import { loadProjectConfig } from '../packages/sdk/src/config.js';

const projectDir = resolve(import.meta.dir, '../templates/default');
const cfg = await loadProjectConfig(projectDir);

async function build() {
  console.log('🛠️ Rebuilding components...');
  try {
    const latest = await loadProjectConfig(projectDir);
    await compileComponents(projectDir, latest.outDir, {
      componentsDir: latest.componentsDir,
      tokensFile: latest.tokensFile,
    });
    console.log('✅ Build complete!');
  } catch (e) {
    console.error('❌ Build error:', e);
  }
}

// Initial build
await build();

console.log(`\n👀 Watching ${cfg.componentsDir} for changes...`);
watch(cfg.componentsDir, { recursive: true }, async (_event, filename) => {
  if (filename && (filename.endsWith('.ts') || filename.endsWith('.js'))) {
    console.log(`\n🔄 File changed: ${filename}`);
    await build();
  }
});

// Start Vite
const _viteProcess = Bun.spawn(['bun', 'run', 'vite'], {
  cwd: resolve(import.meta.dir, '../sandbox'),
  stdio: ['inherit', 'inherit', 'inherit'],
});

console.log('\n🚀 Dev server running on http://localhost:3000\n');
