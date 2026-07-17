#!/usr/bin/env bun
import { existsSync, type FSWatcher, watch } from 'node:fs';
import { cp } from 'node:fs/promises';
import { basename, dirname, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';
import type { KitbashProjectConfig } from './config.js';

function printHelp() {
  console.log(`
@ktbsh/sdk CLI

Commands:
  init <project-name>   Scaffold a new design system
  build                 Compile components (kitbash.config.ts optional)
  dev                   Watch components/tokens/config and rebuild

Options:
  -h, --help            Show this help
  `);
}

async function main() {
  let positionals: string[];
  let values: { help?: boolean };
  try {
    const parsed = parseArgs({
      args: Bun.argv.slice(2),
      allowPositionals: true,
      strict: true,
      options: {
        help: { type: 'boolean', short: 'h' },
      },
    });
    positionals = parsed.positionals;
    values = parsed.values;
  } catch (err) {
    console.error(`❌ ${(err as Error).message}`);
    printHelp();
    process.exit(1);
  }

  if (values.help || !positionals[0]) {
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
    /** Source watchers (cleared/rebuilt when config paths change). */
    const watchers: FSWatcher[] = [];
    /** Sticky watchers (e.g. project root for config create) — never cleared. */
    const stickyWatchers: FSWatcher[] = [];

    const clearWatchers = () => {
      for (const w of watchers) {
        try {
          w.close();
        } catch {
          // ignore
        }
      }
      watchers.length = 0;
    };

    const nearestExisting = (path: string): string | null => {
      let cur = path;
      for (let i = 0; i < 32; i++) {
        if (existsSync(cur)) return cur;
        const parent = dirname(cur);
        if (parent === cur) break;
        cur = parent;
      }
      return null;
    };

    const isUnderOutDir = (cfg: KitbashProjectConfig, absFile: string) => {
      const out = cfg.outDir.endsWith(sep) ? cfg.outDir : cfg.outDir + sep;
      return absFile === cfg.outDir || absFile.startsWith(out);
    };

    const watchPath = (
      path: string,
      opts: { recursive?: boolean },
      onEvent: (event: string, filename: string | null) => void,
      sticky = false,
    ) => {
      if (!existsSync(path)) return;
      try {
        const w = watch(path, opts, (event, filename) => {
          onEvent(event, filename?.toString() ?? null);
        });
        w.on('error', (err) => {
          console.warn(`⚠️ Watcher error (${path}):`, err);
        });
        (sticky ? stickyWatchers : watchers).push(w);
      } catch (err) {
        console.warn(`⚠️ Could not watch ${path}:`, err);
      }
    };

    /** Watch path or nearest ancestor until path appears (then next rebuild rebinds). */
    const watchPathOrAncestor = (
      target: string,
      opts: { recursive?: boolean },
      onEvent: (event: string, filename: string | null) => void,
      onMaybeCreated: () => void,
    ) => {
      if (existsSync(target)) {
        watchPath(target, opts, onEvent);
        return;
      }
      const ancestor = nearestExisting(dirname(target));
      if (!ancestor) return;
      watchPath(ancestor, { recursive: true }, () => {
        if (existsSync(target)) onMaybeCreated();
      });
    };

    const attachWatchers = (
      cfg: KitbashProjectConfig,
      schedule: (reason: string) => void,
    ) => {
      clearWatchers();

      // Never schedule rebuilds for files under outDir (nested outDir under components).
      watchPathOrAncestor(
        cfg.componentsDir,
        { recursive: true },
        (event, name) => {
          if (!name || !(name.endsWith('.ts') || name.endsWith('.js'))) return;
          const abs = resolve(cfg.componentsDir, name);
          if (isUnderOutDir(cfg, abs)) return;
          schedule(`${event} ${name}`);
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
        const p = resolve(projectDir, name);
        watchPathOrAncestor(
          p,
          {},
          () => schedule(name),
          () => schedule(`${name}-created`),
        );
      }
    };

    const schedule = (reason: string) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void rebuild(reason);
      }, 80);
    };

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
        // Always (re)bind watchers from latest loadable config — even after errors
        // so path changes apply and a failed first build still watches sources.
        try {
          const cfg = await loadProjectConfig(projectDir);
          attachWatchers(cfg, schedule);
        } catch {
          // config unreadable — keep previous watchers if any
        }
        building = false;
        if (queued) {
          queued = false;
          schedule('queued');
        }
      }
    };

    console.log(`\n👀 kitbash dev — watching project at ${projectDir}\n`);
    console.log(
      '(Run from your design-system package root, not the monorepo root.)\n',
    );

    // Always watch project root for config create/rename (even if file missing).
    watchPath(
      projectDir,
      {},
      (_event, name) => {
        if (name === 'kitbash.config.ts' || name === 'kitbash.config.js') {
          schedule(`config ${name}`);
        }
      },
      true,
    );

    process.on('SIGINT', () => {
      clearWatchers();
      for (const w of stickyWatchers) {
        try {
          w.close();
        } catch {
          // ignore
        }
      }
      process.exit(0);
    });

    await rebuild('initial');
    console.log('Watching components, tokens, and config (Ctrl+C to stop)…\n');
    await new Promise(() => {});
  } else {
    console.error(`❌ Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }
}

main();
