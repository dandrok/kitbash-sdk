#!/usr/bin/env bun
/**
 * CI smoke checks for @ktbsh/sdk:
 * 1) Build the package (template embed + CLI bundle)
 * 2) Compile the workspace fixture design system
 * 3) Scaffold via `kitbash init` into a temp dir and build it
 */
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const sdkDir = resolve(root, 'packages/sdk');
const cliPath = resolve(sdkDir, 'dist/cli.js');
const fixtureDir = resolve(root, 'templates/default');

function run(
  cmd: string[],
  cwd: string,
  env: Record<string, string> = {},
): void {
  console.log(`\n$ (cd ${cwd}) ${cmd.join(' ')}`);
  const result = Bun.spawnSync(cmd, {
    cwd,
    env: { ...process.env, ...env },
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if (result.exitCode !== 0) {
    throw new Error(`Command failed (${result.exitCode}): ${cmd.join(' ')}`);
  }
}

function assertFile(path: string): void {
  if (!existsSync(path)) {
    throw new Error(`Expected file missing: ${path}`);
  }
  console.log(`✓ ${path}`);
}

async function main() {
  console.log('🔨 Building @ktbsh/sdk…');
  // Drop previous outputs so asserts cannot pass on stale artifacts.
  await rm(resolve(sdkDir, 'dist'), { recursive: true, force: true });

  const initReadmePath = resolve(sdkDir, 'templates/default/README.md');
  const preservedInitReadme = existsSync(initReadmePath)
    ? await Bun.file(initReadmePath).text()
    : null;
  await rm(resolve(sdkDir, 'templates/default'), {
    recursive: true,
    force: true,
  });
  // Init README is not embedded from the workspace fixture (build preserves it).
  // Re-seed so a full wipe still exercises that path without losing the file.
  if (preservedInitReadme !== null) {
    await mkdir(resolve(sdkDir, 'templates/default'), { recursive: true });
    await Bun.write(initReadmePath, preservedInitReadme);
  }

  run(['bun', 'run', 'build'], sdkDir);
  assertFile(cliPath);
  assertFile(resolve(sdkDir, 'templates/default/package.json'));
  assertFile(resolve(sdkDir, 'templates/default/README.md'));

  console.log('\n🧱 Compiling workspace fixture (templates/default)…');
  await rm(resolve(fixtureDir, 'dist'), { recursive: true, force: true });
  run(['bun', cliPath, 'build'], fixtureDir);
  assertFile(resolve(fixtureDir, 'dist/vanilla/button.js'));
  assertFile(resolve(fixtureDir, 'dist/vanilla/input.js'));
  assertFile(resolve(fixtureDir, 'dist/react/button.js'));
  assertFile(resolve(fixtureDir, 'dist/react/input.js'));
  assertFile(resolve(fixtureDir, 'dist/custom-elements.json'));

  console.log('\n🚀 Scaffolding via kitbash init…');
  const parent = await mkdtemp(join(tmpdir(), 'kitbash-ci-'));
  const projectName = 'smoke-ds';
  const projectDir = join(parent, projectName);

  try {
    run(['bun', cliPath, 'init', projectName], parent);

    assertFile(join(projectDir, 'package.json'));
    assertFile(join(projectDir, 'src/components/button.ts'));
    assertFile(join(projectDir, 'README.md'));

    // Point the scaffold at the local SDK build (workspace / file path)
    const pkgPath = join(projectDir, 'package.json');
    const pkg = await Bun.file(pkgPath).json();
    pkg.dependencies = {
      ...pkg.dependencies,
      '@ktbsh/sdk': `file:${sdkDir}`,
    };
    await Bun.write(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

    run(['bun', 'install'], projectDir);
    run(['bun', 'run', 'build'], projectDir);

    assertFile(join(projectDir, 'dist/vanilla/button.js'));
    assertFile(join(projectDir, 'dist/custom-elements.json'));
  } finally {
    await rm(parent, { recursive: true, force: true });
  }

  console.log('\n✅ CI smoke checks passed.');
}

main().catch((err) => {
  console.error('\n❌ CI smoke checks failed:', err);
  process.exit(1);
});
