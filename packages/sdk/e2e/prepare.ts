#!/usr/bin/env bun
/**
 * Compile a minimal form-associated field to e2e/fixture-dist (minified vanilla + uhtml)
 * and write index.html for Playwright.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileComponents } from '../src/compiler.js';

const here = dirname(fileURLToPath(import.meta.url));
const projectDir = join(here, '.project');
const outDir = join(here, 'fixture-dist');

await rm(projectDir, { recursive: true, force: true });
await rm(outDir, { recursive: true, force: true });
await mkdir(join(projectDir, 'src/components'), { recursive: true });

await writeFile(
  join(projectDir, 'src/components/field.ts'),
  `
export default {
  tag: 'kb-browser-field',
  formAssociated: true,
  delegatesFocus: true,
  props: {
    name: { type: String, default: 'username' },
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
    return html\`
      <input
        part="field-root"
        name=\${props.name}
        .value=\${props.value}
        ?required=\${props.required}
      />
    \`;
  },
};
`,
);

await compileComponents(projectDir, outDir);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Kitbash browser runtime fixture</title>
</head>
<body>
  <form id="form">
    <kb-browser-field id="field" name="username" required></kb-browser-field>
    <button type="submit">Submit</button>
  </form>
  <pre id="log"></pre>
  <script type="module">
    import './vanilla/field.js';

    const field = document.getElementById('field');
    const log = document.getElementById('log');
    window.__kitbash = {
      events: [],
      get value() {
        return field.value;
      },
      setValue(v) {
        field.value = v;
      },
      commit(patch) {
        field.commit(patch);
      },
    };

    field.addEventListener('kitbash-change', (e) => {
      window.__kitbash.events.push({
        props: { ...e.detail.props },
        state: { ...e.detail.state },
      });
      log.textContent = JSON.stringify(window.__kitbash.events, null, 2);
    });
  </script>
</body>
</html>
`;

await writeFile(join(outDir, 'index.html'), html);
console.log(`✅ Browser fixture ready at ${outDir}`);
