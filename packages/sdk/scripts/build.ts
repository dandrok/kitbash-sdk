import { cp, rm } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const projectDir = process.cwd();
const srcTemplate = resolve(projectDir, '../../templates/default');
const destTemplate = resolve(projectDir, 'templates/default');

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
    ].includes(name);
  },
});

console.log('✅ Template safely embedded into the package build directory.');
