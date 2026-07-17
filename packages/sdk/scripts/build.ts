import { existsSync } from 'node:fs';
import { cp, rm } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const scriptDir = import.meta.dir;
const srcTemplate = resolve(scriptDir, '../../../templates/default');
const destTemplate = resolve(scriptDir, '../templates/default');
const destReadme = resolve(destTemplate, 'README.md');

// Keep the init-facing README (user-project docs). Root templates/default/README.md
// is monorepo contributor docs and must not replace it on embed.
let preservedInitReadme: string | null = null;
if (existsSync(destReadme)) {
  preservedInitReadme = await Bun.file(destReadme).text();
}

await rm(destTemplate, { recursive: true, force: true });
await cp(srcTemplate, destTemplate, {
  recursive: true,
  filter: (src) => {
    const name = basename(src);
    return ![
      'node_modules',
      'dist',
      '.git',
      'bun.lockb',
      'package-lock.json',
      'yarn.lock',
      // Workspace fixture README ≠ scaffold README for kitbash init
      'README.md',
    ].includes(name);
  },
});

if (preservedInitReadme !== null) {
  await Bun.write(destReadme, preservedInitReadme);
} else {
  console.warn(
    '⚠️ No existing packages/sdk/templates/default/README.md to restore after template embed.',
  );
}

console.log('✅ Template safely embedded into the package build directory.');
