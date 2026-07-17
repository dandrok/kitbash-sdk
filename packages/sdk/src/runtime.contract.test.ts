import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Window } from 'happy-dom';
import { compileComponents } from './compiler.js';

type MockInternals = {
  formValue: string | null;
  setFormValue: (v: string | null) => void;
  setValidity: (...args: unknown[]) => void;
};

/**
 * Runtime contract tests for generated custom elements.
 *
 * Boundary: we load the compiler's **.src.js** (pre-bundle) with a tiny `uhtml`
 * mock. happy-dom's HTML parser mishandles uhtml's Unicode marker attributes,
 * so the minified bundle cannot run here. Real-browser / Playwright coverage
 * of the bundled artifact is a future loop — these tests still exercise the
 * generated class methods (commit, props, events, form value wiring).
 */
describe('runtime form / change contract', () => {
  let projectDir: string;
  let outDir: string;
  let window: Window;
  let document: Document;
  const globalKeys = [
    'window',
    'document',
    'HTMLElement',
    'customElements',
    'CustomEvent',
    'CSSStyleSheet',
    'Element',
    'Node',
    'Event',
  ] as const;
  const savedGlobals = new Map<string, unknown>();

  beforeAll(async () => {
    projectDir = await mkdtemp(join(tmpdir(), 'kitbash-runtime-'));
    outDir = join(projectDir, 'dist');
    await mkdir(join(projectDir, 'src/components'), { recursive: true });

    await writeFile(
      join(projectDir, 'src/components/field.ts'),
      `
export default {
  tag: 'kb-rt-field',
  formAssociated: true,
  delegatesFocus: true,
  props: {
    value: { type: String, default: '' },
    required: { type: Boolean, default: false },
  },
  state: { touched: false },
  events: {
    'input input'(e, { commit }) {
      commit({
        props: { value: e.target.value },
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

    await compileComponents(projectDir, outDir);

    window = new Window({ url: 'https://localhost/' });
    document = window.document;

    const HE = window.HTMLElement as typeof HTMLElement;
    HE.prototype.attachInternals = function attachInternals(this: HTMLElement) {
      const internals: MockInternals = {
        formValue: null,
        setFormValue(v) {
          internals.formValue = v;
        },
        setValidity() {},
      };
      (
        this as HTMLElement & { __mockInternals?: MockInternals }
      ).__mockInternals = internals;
      return internals as unknown as ElementInternals;
    };

    for (const key of globalKeys) {
      savedGlobals.set(key, (globalThis as Record<string, unknown>)[key]);
    }
    Object.assign(globalThis, {
      window,
      document,
      HTMLElement: window.HTMLElement,
      customElements: window.customElements,
      CustomEvent: window.CustomEvent,
      CSSStyleSheet: class {
        replaceSync() {}
      },
      Element: window.Element,
      Node: window.Node,
      Event: window.Event,
    });

    const raw = await Bun.file(join(outDir, 'vanilla/field.src.js')).text();
    if (!raw.includes("from 'uhtml'") && !raw.includes('from "uhtml"')) {
      throw new Error(
        'Expected field.src.js to import uhtml — compiler emit shape changed',
      );
    }
    // Drop any uhtml import line; inject mock (avoids fragile exact-format regex).
    const withoutImport = raw.replace(
      /^import\s*\{[^}]+\}\s*from\s*['"]uhtml['"]\s*;?\s*$/m,
      '',
    );
    const mocked = `
const html = (strings, ...values) => ({ strings, values });
const render = (root, _tree) => {
  if (!root) return;
  let input = root.querySelector && root.querySelector('input');
  if (!input) {
    input = document.createElement('input');
    input.setAttribute('part', 'field-root');
    root.appendChild(input);
  }
  const host = root.host;
  if (host && host._props) {
    const v = host._props.value;
    if (v != null && input.value !== String(v)) input.value = String(v);
    if (host._props.required) input.setAttribute('required', '');
    else input.removeAttribute('required');
  }
};
${withoutImport}
`;

    const runtimePath = join(outDir, 'vanilla/field.runtime.js');
    await Bun.write(runtimePath, mocked);
    await import(runtimePath);
  });

  afterAll(async () => {
    for (const key of globalKeys) {
      const prev = savedGlobals.get(key);
      if (prev === undefined) {
        delete (globalThis as Record<string, unknown>)[key];
      } else {
        (globalThis as Record<string, unknown>)[key] = prev;
      }
    }
    await rm(projectDir, { recursive: true, force: true });
    window?.close();
  });

  type FieldEl = HTMLElement & {
    value: string;
    required: boolean;
    commit: (p: {
      props?: Record<string, unknown>;
      state?: Record<string, unknown>;
    }) => void;
    setProps: (p: Record<string, unknown>) => void;
    setState: (s: Record<string, unknown>) => void;
    _props: Record<string, unknown>;
    _state: Record<string, unknown>;
    __mockInternals?: MockInternals;
  };

  function mount(): FieldEl {
    const el = document.createElement('kb-rt-field') as FieldEl;
    document.body.appendChild(el);
    return el;
  }

  test('commit updates props and fires kitbash-change with snapshots', () => {
    const el = mount();
    const events: CustomEvent[] = [];
    el.addEventListener('kitbash-change', (e) => {
      events.push(e as CustomEvent);
    });

    el.commit({ props: { value: 'hello' }, state: { touched: true } });

    expect(el.value).toBe('hello');
    expect(events.length).toBe(1);
    expect(events[0].detail.props.value).toBe('hello');
    expect(events[0].detail.state.touched).toBe(true);
    expect(el.__mockInternals?.formValue).toBe('hello');

    events[0].detail.props.value = 'mutated';
    events[0].detail.state.touched = false;
    expect(el.value).toBe('hello');
    expect(el._state.touched).toBe(true);

    el.remove();
  });

  test('external property set re-renders without kitbash-change', () => {
    const el = mount();
    let count = 0;
    el.addEventListener('kitbash-change', () => {
      count += 1;
    });

    el.value = 'from-outside';
    expect(el.value).toBe('from-outside');
    expect(count).toBe(0);
    expect(el.__mockInternals?.formValue).toBe('from-outside');

    el.remove();
  });

  test('input handler path uses commit (typing fires change with value)', () => {
    const el = mount();
    const events: CustomEvent[] = [];
    el.addEventListener('kitbash-change', (e) => {
      events.push(e as CustomEvent);
    });

    const input = el.shadowRoot?.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();

    input.value = 'typed';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));

    expect(events.length).toBe(1);
    expect(events[0].detail.props.value).toBe('typed');
    expect(el.value).toBe('typed');
    expect(el._state.touched).toBe(true);
    expect(el.__mockInternals?.formValue).toBe('typed');

    el.remove();
  });

  test('setProps is one-shot emit like commit', () => {
    const el = mount();
    let count = 0;
    el.addEventListener('kitbash-change', () => {
      count += 1;
    });

    el.setProps({ value: 'a', required: true });
    expect(count).toBe(1);
    expect(el.value).toBe('a');
    expect(el.required).toBe(true);
    expect(el.__mockInternals?.formValue).toBe('a');

    el.remove();
  });

  test('commit ignores undeclared prop keys', () => {
    const el = mount();
    el.commit({
      props: { value: 'ok', notAProp: 'nope' } as Record<string, unknown>,
    });
    expect(el.value).toBe('ok');
    expect((el._props as Record<string, unknown>).notAProp).toBeUndefined();
    el.remove();
  });
});
