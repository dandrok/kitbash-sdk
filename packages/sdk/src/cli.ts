#!/usr/bin/env bun
import { existsSync } from 'node:fs';
import { cp } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { parseArgs } from 'node:util';

async function main() {
  const { positionals } = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
  });

  const command = positionals[0];

  if (command === 'init') {
    const projectName = positionals[1];
    if (!projectName) {
      console.error(
        '❌ Error: Missing project name.\nUsage: kitbash init <project-name>',
      );
      process.exit(1);
    }

    const cleanName = basename(projectName);
    if (
      cleanName !== projectName ||
      projectName === '..' ||
      projectName === '.'
    ) {
      console.error(
        '❌ Error: Invalid project name. Directory traversal is not allowed.',
      );
      process.exit(1);
    }

    const targetDir = resolve(process.cwd(), projectName);

    if (existsSync(targetDir)) {
      console.error(`❌ Error: Directory '${projectName}' already exists.`);
      process.exit(1);
    }

    console.log(`\n🚀 Scaffolding Kitbash project in ${targetDir}...\n`);

    let templateDir = resolve(import.meta.dir, '../templates/default');
    if (!existsSync(templateDir)) {
      // Fallback for local monorepo development if it wasn't built yet
      templateDir = resolve(import.meta.dir, '../../../templates/default');
    }

    try {
      const excludedPatterns = [
        'node_modules',
        'dist',
        '.git',
        'bun.lockb',
        'package-lock.json',
        'yarn.lock',
      ];
      await cp(templateDir, targetDir, {
        recursive: true,
        filter: (src) => {
          return !excludedPatterns.includes(basename(src));
        },
      });

      const scaffoldedPkgPath = resolve(targetDir, 'package.json');
      if (existsSync(scaffoldedPkgPath)) {
        let sdkVersion = '^0.1.0';
        try {
          const sdkPkgPath = resolve(import.meta.dir, '../package.json');
          if (existsSync(sdkPkgPath)) {
            const sdkPkg = await Bun.file(sdkPkgPath).json();
            if (sdkPkg.version) sdkVersion = `^${sdkPkg.version}`;
          }
        } catch (_e) {
          // Fallback to ^0.1.0 if read fails
        }

        const targetPkg = await Bun.file(scaffoldedPkgPath).json();
        if (targetPkg.dependencies?.['@kitbash/sdk'] === 'workspace:*') {
          targetPkg.dependencies['@kitbash/sdk'] = sdkVersion;
        }
        if (targetPkg.devDependencies?.['@kitbash/sdk'] === 'workspace:*') {
          targetPkg.devDependencies['@kitbash/sdk'] = sdkVersion;
        }
        await Bun.write(
          scaffoldedPkgPath,
          `${JSON.stringify(targetPkg, null, 2)}\n`,
        );
      }

      console.log(`✅ Project scaffolded successfully.`);
      console.log(`\nNext steps:`);
      console.log(`  cd ${projectName}`);
      console.log(`  bun install`);
      console.log(`  bun run build`);
      console.log(`\nReady for development.\n`);
    } catch (err) {
      console.error(`❌ Failed to copy template files:`, err);
      process.exit(1);
    }
  } else if (command === 'build') {
    console.log(`\n🚀 Compiling Kitbash components...\n`);
    const projectDir = process.cwd();
    const outDir = resolve(projectDir, 'dist');

    try {
      // Dynamic import to avoid loading the compiler during fast init commands
      const { compileComponents } = await import('./compiler.js');
      await compileComponents(projectDir, outDir);
      console.log(`\n✅ Build successful! Outputs written to dist/\n`);
    } catch (err) {
      console.error(`❌ Build failed:`, err);
      process.exit(1);
    }
  } else {
    console.log(`
@kitbash/sdk CLI

Commands:
  init <project-name>   Scaffold a new design system
  build                 Compile src/components to dist/
    `);
  }
}

main();
