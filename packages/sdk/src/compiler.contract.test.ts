import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compileComponents } from './compiler.js';

/**
 * Contract tests: generated vanilla runtime must expose a light
 * props/state commit path so kitbash-change carries fresh props
 * without host shadow-root hacks.
 */
describe('compiler form / change contract', () => {
  let projectDir: string;
  let outDir: string;

  beforeAll(async () => {
    projectDir = await mkdtemp(join(tmpdir(), 'kitbash-contract-'));
    outDir = join(projectDir, 'dist');
    await mkdir(join(projectDir, 'src/components'), { recursive: true });

    // No package import — compiler only needs `export default` config (defineComponent is identity).
    await writeFile(
      join(projectDir, 'src/components/field.ts'),
      `
export default {
  tag: 'kb-field',
  formAssociated: true,
  delegatesFocus: true,
  props: {
    value: { type: String, default: '' },
    required: { type: Boolean, default: false },
  },
  state: { touched: false },
  events: {
    'input input'(e, { commit }) {
      const t = e.target;
      commit({
        props: { value: t.value },
        state: { touched: true },
      });
    },
  },
  render({ props, html }) {
    return html\`<input part="field-root" .value=\${props.value} ?required=\${props.required} />\`;
  },
};
`,
    );
  });

  afterAll(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  test('emits commit + setProps and wires them into event / render context', async () => {
    await compileComponents(projectDir, outDir);
    const src = await Bun.file(join(outDir, 'vanilla/field.src.js')).text();

    expect(src).toContain('commit(patch)');
    expect(src).toContain('setProps(nextProps)');
    expect(src).toContain('setState(newState)');
    expect(src).toContain('_emitChange()');
    expect(src).toContain('_assignProp(');
    // Event detail must not expose live internal object references
    expect(src).toContain('state: { ...this._state }');
    expect(src).toContain('props: { ...this._props }');

    // Single batch path preferred for input handlers
    expect(src).toContain('commit: this.commit.bind(this)');
    expect(src).toContain('setProps: this.setProps.bind(this)');
    expect(src).toContain('props: { ...this._props }');
    expect(src).toContain('state: { ...this._state }');
    expect(src).toContain('hasOwnProperty.call(allowed, key)');

    // External property sets re-render without kitbash-change spam
    expect(src).toMatch(
      /set value\(val\)[\s\S]*?_assignProp\('value', val\);[\s\S]*?this\.update\(\);/,
    );

    // Form association still present
    expect(src).toContain('static formAssociated = true');
    expect(src).toContain('setFormValue');
  });

  test('React wrapper bridges kitbash-change and merges refs', async () => {
    await compileComponents(projectDir, outDir);
    const react = await Bun.file(join(outDir, 'react/field.js')).text();

    expect(react).toContain("addEventListener('kitbash-change'");
    expect(react).toContain('onKitbashChange');
    // callback + object ref support
    expect(react).toContain("typeof ref === 'function'");
    // Do not double-bind click — React handles onClick via props
    expect(react).not.toContain("addEventListener('click'");
    // Callback ref assignment + clear path (function refs get null on unmount)
    expect(react).toContain('setRefs');
    expect(react).toContain("typeof ref === 'function'");
    expect(react).toContain('ref.current = node');
  });

  test('prop reflection does not re-enter attributeChangedCallback', async () => {
    await compileComponents(projectDir, outDir);
    const src = await Bun.file(join(outDir, 'vanilla/field.src.js')).text();
    expect(src).toContain('this._reflecting = true');
    expect(src).toContain('if (this._reflecting) return');
  });
});
