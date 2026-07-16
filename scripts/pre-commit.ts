#!/usr/bin/env bun
export {};

async function main() {
  console.log('🔍 Running Biome checks on staged files...');

  // Retrieve staged files
  const diffProcess = Bun.spawnSync(['git', 'diff', '--cached', '--name-only']);
  const files = diffProcess.stdout
    .toString()
    .trim()
    .split('\n')
    .filter(
      (f) =>
        f &&
        (f.endsWith('.ts') ||
          f.endsWith('.tsx') ||
          f.endsWith('.js') ||
          f.endsWith('.jsx') ||
          f.endsWith('.json')),
    );

  if (files.length === 0) {
    console.log('✨ No relevant staged files. Skipping check.');
    process.exit(0);
  }

  // Execute biome formatting and safe auto-fixes
  const biomeProcess = Bun.spawnSync([
    'bunx',
    'biome',
    'check',
    '--write',
    ...files,
  ]);

  if (biomeProcess.exitCode !== 0) {
    console.error('❌ Biome check failed. Please fix the following errors:\n');
    console.error(biomeProcess.stdout.toString());
    console.error(biomeProcess.stderr.toString());
    process.exit(1);
  }

  // Re-stage the files that biome successfully auto-fixed
  Bun.spawnSync(['git', 'add', ...files]);

  console.log('✅ All staged files passed Biome checks!');
}

main();
