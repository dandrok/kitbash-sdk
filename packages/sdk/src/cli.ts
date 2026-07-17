#!/usr/bin/env bun
import { existsSync, watch } from 'node:fs';
import { cp } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { parseArgs } from 'node:util';

function printHelp() {
  console.log(`
@ktbsh/sdk CLI

Commands:
  init <project-name>   Scaffold a new design system
  build                 Compile components (kitbash.config.ts optional)
  dev                   Watch components/tokens/config and rebuild
  `);
}

async function main() {
  const { positionals, values } = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
    strict: false,
    options: {
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help) {
    printHelp();
    return;
  }

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
      projectName === '.' ||
      projectName.includes('/') ||
      projectName.includes('\\')
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
        if (targetPkg.dependencies?.['@ktbsh/sdk'] === 'workspace:*') {
          targetPkg.dependencies['@ktbsh/sdk'] = sdkVersion;
        }
        if (targetPkg.devDependencies?.['@ktbsh/sdk'] === 'workspace:*') {
          targetPkg.devDependencies['@ktbsh/sdk'] = sdkVersion;
        }
        // Prefer watch-friendly script for new scaffolds
        targetPkg.scripts = {
          ...targetPkg.scripts,
          build: 'kitbash build',
          dev: 'kitbash dev',
        };
        await Bun.write(
          scaffoldedPkgPath,
          `${JSON.stringify(targetPkg, null, 2)}\n`,
        );
      }

      console.log(`✅ Project scaffolded successfully.`);
      console.log(`\nNext steps:`);
      console.log(`  cd ${projectName}`);
      console.log(`  bun install`);
      console.log(`  bun run dev`);
      console.log(`  # or: bun run build`);
      console.log(`\nReady for development.\n`);
    } catch (err) {
      console.error(`❌ Failed to copy template files:`, err);
      process.exit(1);
    }
  } else if (command === 'build') {
    console.log(`\n🚀 Compiling Kitbash components...\n`);
    const projectDir = process.cwd();

    try {
      const { runProjectBuild } = await import('./build-project.js');
      const cfg = await runProjectBuild(projectDir);
      console.log(`\n✅ Build successful! Outputs written to ${cfg.outDir}/\n`);
    } catch (err) {
      console.error(`❌ Build failed:`, err);
      process.exit(1);
    }
  } else if (command === 'dev') {
    const projectDir = process.cwd();
    const { runProjectBuild } = await import('./build-project.js');
    const { loadProjectConfig } = await import('./config.js');

    let building = false;
    let queued = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const rebuild = async (reason: string) => {
      if (building) {
        queued = true;
        return;
      }
      building = true;
      try {
        console.log(`\n🔄 Rebuild (${reason})…\n`);
        const cfg = await runProjectBuild(projectDir);
        console.log(`✅ Build ok → ${cfg.outDir}/\n`);
      } catch (err) {
        console.error(`❌ Build failed:`, err);
      } finally {
        building = false;
        if (queued) {
          queued = false;
          // Re-enter through debounce so bursts still coalesce
          schedule('queued');
        }
      }
    };

    const schedule = (reason: string) => {
      if (timer) clearTimeout(timer);
      // Light debounce: coalesce bursty editor saves
      timer = setTimeout(() => {
        void rebuild(reason);
      }, 80);
    };

    console.log(`\n👀 kitbash dev — watching project at ${projectDir}\n`);
    await rebuild('initial');

    const cfg = await loadProjectConfig(projectDir);

    // Watch only sources — never outDir (would infinite-loop on emit).
    const watchFile = (path: string, label: string) => {
      if (!existsSync(path)) return;
      try {
        watch(path, () => schedule(label));
      } catch (err) {
        console.warn(`⚠️ Could not watch ${path}:`, err);
      }
    };

    if (existsSync(cfg.componentsDir)) {
      try {
        watch(cfg.componentsDir, { recursive: true }, (event, filename) => {
          const name = filename?.toString() ?? '';
          if (name.endsWith('.ts') || name.endsWith('.js')) {
            schedule(`${event} ${name}`);
          }
        });
      } catch (err) {
        console.warn(`⚠️ Could not watch ${cfg.componentsDir}:`, err);
      }
    }

    watchFile(cfg.tokensFile, `tokens ${basename(cfg.tokensFile)}`);
    watchFile(resolve(projectDir, 'kitbash.config.ts'), 'kitbash.config.ts');
    watchFile(resolve(projectDir, 'kitbash.config.js'), 'kitbash.config.js');

    console.log('Watching components, tokens, and config (Ctrl+C to stop)…\n');
    // Keep process alive
    await new Promise(() => {});
  } else {
    printHelp();
  }
}

main();
