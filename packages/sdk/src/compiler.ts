import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { basename, resolve as pathResolve } from 'node:path';
import type { ComponentConfig } from './index.js';

const uhtmlPath = Bun.resolveSync('uhtml', import.meta.dir);

function toPascalCase(str: string): string {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function normalizeFn(fnStr: string): string {
  fnStr = fnStr.trim();
  if (fnStr.startsWith('function') || fnStr.startsWith('async function'))
    return fnStr;

  if (fnStr.startsWith('(')) return fnStr; // (args) => ...

  const firstParen = fnStr.indexOf('(');
  const arrowIdx = fnStr.indexOf('=>');
  const firstBrace = fnStr.indexOf('{');

  if (arrowIdx > -1 && (firstBrace === -1 || arrowIdx < firstBrace)) {
    return fnStr; // Arrow comes before the body, so it is an arrow function
  }

  const isAsync = fnStr.startsWith('async ');
  if (firstParen > -1) {
    return (isAsync ? 'async function' : 'function') + fnStr.slice(firstParen);
  }

  return fnStr;
}

function generateTokenStyles(
  tokens: Record<string, unknown>,
  prefix = '',
): string {
  let css = '';
  for (const [key, value] of Object.entries(tokens)) {
    if (typeof value === 'object' && value !== null) {
      css += generateTokenStyles(value, `${prefix}${key}-`);
    } else {
      css += `--${prefix}${key}: ${value};\n`;
    }
  }
  return css;
}

function generateVanillaComponent(
  config: ComponentConfig,
  tokensCss: string = '',
): string {
  const propsArray = config.props ? Object.keys(config.props) : [];
  const propsJson = JSON.stringify(propsArray);

  const renderFnStr = config.render
    ? normalizeFn(config.render.toString())
    : '() => ""';

  const eventsObjStr = config.events
    ? `{ ${Object.entries(config.events)
        .map(([k, v]) => `'${k}': ${normalizeFn(v.toString())}`)
        .join(', ')} }`
    : '{}';

  const propTypesJson = JSON.stringify(
    Object.fromEntries(
      Object.entries(config.props || {}).map(([k, v]) => [k, v.type?.name]),
    ),
  );

  return `
import { render, html } from 'uhtml';

const sheet = new CSSStyleSheet();
sheet.replaceSync(${JSON.stringify(`${tokensCss}\n${config.styles || ''}`)});

export class ${toPascalCase(config.tag)} extends HTMLElement {
  ${config.formAssociated ? 'static formAssociated = true;' : ''}
  static get observedAttributes() {
    return ${propsJson};
  }
  
  static get propTypes() {
    return ${propTypesJson};
  }

${propsArray
  .map(
    (prop) => `
  get ${prop}() {
    return this._props['${prop}'];
  }
  set ${prop}(val) {
    const type = this.constructor.propTypes['${prop}'];
    const isTrue = type === 'Boolean' ? (val === true || val === '') : false;
    this._props['${prop}'] = type === 'Boolean' ? isTrue : val;
    
    if (type === 'Boolean') {
      if (isTrue) this.setAttribute('${prop}', '');
      else this.removeAttribute('${prop}');
    } else {
      if (val === null || val === undefined) this.removeAttribute('${prop}');
      else this.setAttribute('${prop}', val);
    }
    ${config.formAssociated && prop === 'value' ? 'if (this._internals) this._internals.setFormValue(val);' : ''}
    this.update();
  }
`,
  )
  .join('')}

  constructor() {
    super();
    this.attachShadow({ mode: 'open', delegatesFocus: ${Boolean(config.delegatesFocus)} });
    ${config.formAssociated ? 'this._internals = this.attachInternals();' : ''}
    this.shadowRoot.adoptedStyleSheets = [sheet];
    
    this._defaults = ${JSON.stringify(
      Object.fromEntries(
        Object.entries(config.props || {}).map(([k, v]) => [
          k,
          (v as Record<string, unknown>).default ?? null,
        ]),
      ),
    )};
    
    this._state = ${JSON.stringify(config.state || {})};
    this._props = { ...this._defaults };
    this._eventHandlers = ${eventsObjStr};
    this._eventCleanup = [];
    this._renderFn = ${renderFnStr};
  }

  connectedCallback() {
    // Initial attribute values are parsed by attributeChangedCallback before connectedCallback fires
    this.update();
    ${config.formAssociated ? `if (this.value !== undefined) this._internals.setFormValue(this.value);` : ''}
  }

  disconnectedCallback() {
    this.cleanupEvents();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      const type = this.constructor.propTypes[name];
      
      let parsedValue = newValue;
      if (newValue === null || newValue === undefined) {
        parsedValue = this._defaults[name];
      } else if (type === 'Number') {
        parsedValue = Number(newValue);
      } else if (type === 'Boolean') {
        parsedValue = newValue !== null && newValue !== 'false';
      }
      
      this._props[name] = parsedValue;
      this.update();
    }
  }

  setState(newState) {
    this._state = { ...this._state, ...newState };
    this.update();
    
    this.dispatchEvent(new CustomEvent('kitbash-change', {
      detail: { state: this._state, props: this._props },
      bubbles: true,
      composed: true
    }));
  }
  
  cleanupEvents() {
    this._eventCleanup.forEach(cleanup => cleanup());
    this._eventCleanup = [];
  }

  update() {
    // Run the uhtml DOM diffing render cycle
    render(this.shadowRoot, this._renderFn({ 
      props: this._props, 
      state: this._state, 
      setState: this.setState.bind(this),
      html 
    }));
    this.cleanupEvents();
    this.bindEvents();
    ${config.formAssociated ? 'this.syncFormState();' : ''}
  }

${
  config.formAssociated
    ? `
  syncFormState() {
    const flags = {};
    let msg = '';
    if (this._props.invalid) {
      flags.customError = true;
      msg = 'Invalid field.';
    } else if (this._props.required && !this._props.value) {
      flags.valueMissing = true;
      msg = 'This field is required.';
    }
    if (Object.keys(flags).length > 0) {
      this._internals.setValidity(flags, msg);
    } else {
      this._internals.setValidity({});
    }
  }
`
    : ''
}

  bindEvents() {
    Object.keys(this._eventHandlers).forEach(eventSelector => {
      const parts = eventSelector.split(' ');
      const eventName = parts[0];
      const selector = parts.slice(1).join(' ');
      
      const targets = selector ? this.shadowRoot.querySelectorAll(selector) : [this];
      targets.forEach(target => {
        const handler = (e) => {
          this._eventHandlers[eventSelector](e, { 
            state: this._state, 
            setState: this.setState.bind(this) 
          });
        };
        target.addEventListener(eventName, handler);
        this._eventCleanup.push(() => target.removeEventListener(eventName, handler));
      });
    });
  }
}

if (!customElements.get('${config.tag}')) {
  customElements.define('${config.tag}', ${toPascalCase(config.tag)});
}
`;
}

function generateReactWrapper(config: ComponentConfig, componentName: string) {
  const pascalName = toPascalCase(config.tag);

  const code = `
import * as React from 'react';
import '../vanilla/${componentName}.js';

export const ${pascalName} = React.forwardRef(({ children, onClick, onKitbashChange, ...props }, ref) => {
  const localRef = React.useRef(null);
  const combinedRef = ref || localRef;

  React.useEffect(() => {
    // In React 19, if a ref is passed as a function, combinedRef won't have .current.
    // For simplicity in this compiler output, we assume combinedRef is a RefObject.
    // A robust version would use useImperativeHandle or merge refs.
    const el = typeof combinedRef === 'function' ? null : combinedRef.current;
    if (!el) return;

    const handleCustomChange = (e) => {
      if (onKitbashChange) onKitbashChange(e);
    };

    const handleNativeClick = (e) => {
      if (onClick) onClick(e);
    };

    el.addEventListener('kitbash-change', handleCustomChange);
    el.addEventListener('click', handleNativeClick);

    return () => {
      el.removeEventListener('kitbash-change', handleCustomChange);
      el.removeEventListener('click', handleNativeClick);
    };
  }, [onClick, onKitbashChange, combinedRef]);

  return React.createElement('${config.tag}', { ref: combinedRef, ...props }, children);
});
`;

  const propsInterfaces = [];
  if (config.props) {
    for (const [key, propConfig] of Object.entries(config.props)) {
      let tsType = 'any';
      if (propConfig.type?.name === 'String') tsType = 'string';
      else if (propConfig.type?.name === 'Boolean') tsType = 'boolean';
      else if (propConfig.type?.name === 'Number') tsType = 'number';
      propsInterfaces.push(`'${key}'?: ${tsType};`);
    }
  }

  const types = `
import * as React from 'react';

export interface ${pascalName}Props extends React.HTMLAttributes<HTMLElement> {
  ${propsInterfaces.join('\n  ')}
  onKitbashChange?: (event: CustomEvent<any>) => void;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      '${config.tag}': ${pascalName}Props & React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

export declare const ${pascalName}: React.ForwardRefExoticComponent<${pascalName}Props & React.RefAttributes<HTMLElement>>;
`;

  return { code, types };
}

export async function compileComponents(projectDir: string, outDir: string) {
  const componentsDir = pathResolve(projectDir, 'src/components');
  let files: string[];
  try {
    files = await readdir(componentsDir);
  } catch (_err) {
    console.warn(`No components directory found at ${componentsDir}.`);
    return;
  }

  let tokensCss = '';
  const tokensFile = pathResolve(projectDir, 'src/tokens.json');
  if (existsSync(tokensFile)) {
    try {
      const tokensContent = await Bun.file(tokensFile).text();
      const tokens = JSON.parse(tokensContent);
      tokensCss = `:host {\n${generateTokenStyles(tokens)}}\n`;
      console.log('🎨 Loaded design tokens from tokens.json');
    } catch (err) {
      console.warn('⚠️ Failed to parse tokens.json:', err);
    }
  }

  const cemModules = [];

  for (const file of files) {
    if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;

    const filePath = pathResolve(componentsDir, file);
    const module = await import(filePath);
    const config: ComponentConfig = module.default;

    if (!config?.tag) {
      console.warn(`Skipping ${file}: No valid default ComponentConfig found.`);
      continue;
    }

    const componentName = basename(file, file.endsWith('.ts') ? '.ts' : '.js');

    // Vanilla Target
    const vanillaCode = generateVanillaComponent(config, tokensCss);
    const tempSrcPath = pathResolve(outDir, `vanilla/${componentName}.src.js`);
    await Bun.write(tempSrcPath, vanillaCode);

    // Bundle the vanilla output using Bun's native bundler to bake in uhtml
    const result = await Bun.build({
      entrypoints: [tempSrcPath],
      outdir: pathResolve(outDir, 'vanilla'),
      naming: `${componentName}.js`,
      minify: true,
      target: 'browser',
      plugins: [
        {
          name: 'uhtml-alias',
          setup(b) {
            b.onResolve({ filter: /^uhtml$/ }, () => {
              return { path: uhtmlPath };
            });
          },
        },
      ],
    });

    if (!result.success) {
      console.error(result.logs);
      throw new Error(`Build failed for ${componentName}`);
    }

    // React 19 Target
    const { code: reactCode, types: reactTypes } = generateReactWrapper(
      config,
      componentName,
    );
    await Bun.write(
      pathResolve(outDir, `react/${componentName}.js`),
      reactCode,
    );
    await Bun.write(
      pathResolve(outDir, `react/${componentName}.d.ts`),
      reactTypes,
    );

    console.log(`✅ Compiled <${config.tag}>`);

    const attributes = [];
    if (config.props) {
      for (const [key, propConfig] of Object.entries(config.props)) {
        const configProps = propConfig as Record<string, unknown>;
        attributes.push({
          name: key,
          type: {
            text: (configProps.type as { name?: string })?.name || 'String',
          },
          default:
            typeof configProps.default === 'string'
              ? `"${configProps.default}"`
              : String(configProps.default ?? ''),
        });
      }
    }

    cemModules.push({
      kind: 'javascript-module',
      path: `vanilla/${componentName}.js`,
      declarations: [
        {
          kind: 'class',
          description: '',
          name: toPascalCase(config.tag),
          customElement: true,
          tagName: config.tag,
          attributes,
        },
      ],
      exports: [
        {
          kind: 'custom-element-definition',
          name: config.tag,
          declaration: {
            name: toPascalCase(config.tag),
            module: `vanilla/${componentName}.js`,
          },
        },
      ],
    });
  }

  const manifest = {
    schemaVersion: '1.0.0',
    readme: '',
    modules: cemModules,
  };

  await Bun.write(
    pathResolve(outDir, 'custom-elements.json'),
    JSON.stringify(manifest, null, 2),
  );
  console.log('✅ Generated custom-elements.json');
}
