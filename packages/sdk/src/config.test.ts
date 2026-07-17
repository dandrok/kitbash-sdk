import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { compileComponents } from './compiler.js';
import { loadProjectConfig } from './config.js';

describe('loadProjectConfig', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'kitbash-cfg-'));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test('defaults when no config file', async () => {
    const empty = await mkdtemp(join(tmpdir(), 'kitbash-cfg-empty-'));
    try {
      const cfg = await loadProjectConfig(empty);
      expect(cfg.source).toBe('defaults');
      expect(cfg.componentsDir).toBe(resolve(empty, 'src/components'));
      expect(cfg.tokensFile).toBe(resolve(empty, 'src/tokens.json'));
      expect(cfg.outDir).toBe(resolve(empty, 'dist'));
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  });

  test('reads kitbash.config.ts paths', async () => {
    await writeFile(
      join(dir, 'kitbash.config.ts'),
      `export default {
  components: './lib/ui',
  tokens: './design/tokens.json',
  outDir: './build',
  frameworks: ['react'],
};
`,
    );

    const cfg = await loadProjectConfig(dir);
    expect(cfg.source).toBe('kitbash.config.ts');
    expect(cfg.componentsDir).toBe(resolve(dir, 'lib/ui'));
    expect(cfg.tokensFile).toBe(resolve(dir, 'design/tokens.json'));
    expect(cfg.outDir).toBe(resolve(dir, 'build'));
  });
});

describe('compileComponents respects options', () => {
  let projectDir: string;

  beforeAll(async () => {
    projectDir = await mkdtemp(join(tmpdir(), 'kitbash-cfg-compile-'));
    await mkdir(join(projectDir, 'lib/ui'), { recursive: true });
    await writeFile(
      join(projectDir, 'lib/ui/badge.ts'),
      `export default {
  tag: 'kb-badge',
  props: { label: { type: String, default: 'x' } },
  render({ props, html }) {
    return html\`<span>\${props.label}</span>\`;
  },
};
`,
    );
    await writeFile(
      join(projectDir, 'design-tokens.json'),
      JSON.stringify({ colors: { accent: '#f00' } }),
    );
  });

  afterAll(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  test('compiles from custom components + tokens paths into custom outDir', async () => {
    const outDir = join(projectDir, 'build-out');
    await compileComponents(projectDir, outDir, {
      componentsDir: join(projectDir, 'lib/ui'),
      tokensFile: join(projectDir, 'design-tokens.json'),
    });

    const src = await Bun.file(join(outDir, 'vanilla/badge.src.js')).text();
    expect(src).toContain('kb-badge');
    expect(src).toContain('--colors-accent');
    expect(await Bun.file(join(outDir, 'vanilla/badge.js')).exists()).toBe(
      true,
    );
  });
});
