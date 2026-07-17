import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runProjectBuild } from './build-project.js';

describe('runProjectBuild', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'kitbash-build-'));
    await mkdir(join(dir, 'src/components'), { recursive: true });
    await writeFile(
      join(dir, 'src/components/chip.ts'),
      `export default {
  tag: 'kb-chip',
  props: { label: { type: String, default: 'n' } },
  render({ props, html }) {
    return html\`<span>\${props.label}</span>\`;
  },
};
`,
    );
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test('builds default paths and returns config', async () => {
    const cfg = await runProjectBuild(dir);
    expect(cfg.outDir).toContain(dir);
    expect(await Bun.file(join(cfg.outDir, 'vanilla/chip.js')).exists()).toBe(
      true,
    );
    expect(
      await Bun.file(join(cfg.outDir, 'custom-elements.json')).exists(),
    ).toBe(true);
  });
});
