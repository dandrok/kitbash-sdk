#!/usr/bin/env bun
import { watch } from 'node:fs';
import { resolve } from 'node:path';
import { compileComponents } from '../packages/sdk/src/compiler.js';

const projectDir = resolve(import.meta.dir, '../templates/default');
const outDir = resolve(projectDir, 'dist');

async function build() {
  console.log('🛠️ Rebuilding components...');
  try {
    await compileComponents(projectDir, outDir);
    console.log('✅ Build complete!');
  } catch (e) {
    console.error('❌ Build error:', e);
  }
}

// Initial build
await build();

// Watch src/components
const componentsDir = resolve(projectDir, 'src/components');
console.log(`\n👀 Watching ${componentsDir} for changes...`);
watch(componentsDir, { recursive: true }, async (_event, filename) => {
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
