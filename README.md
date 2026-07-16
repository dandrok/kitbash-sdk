# Kitbash SDK: Enterprise Design System Engine

Welcome to the **Kitbash SDK**—an enterprise-grade, compiler-driven Design System Engine. Kitbash strictly separates the Authoring Experience (AX) from the compiled Runtime Output. Developers write a single, declarative component definition in TypeScript, and the SDK evaluates the configuration in memory, compiling it into highly optimized, native Vanilla Web Components and zero-dependency wrappers for modern frameworks.

## 1. High-Level System Overview & Tech Stack

Kitbash is designed to run on the bleeding edge of the web, guaranteeing a robust, zero-friction developer experience across our host environments:
- **Vite 8:** The latest stable build tool for lightning-fast HMR and optimized production bundling.
- **React 19 (Stable):** Native JSX wrapper generation seamlessly syncing React state to custom elements.
- **Svelte 5 (Stable):** Seamless Vanilla import support running entirely on Svelte's latest rune architecture.

### The uhtml v4 Architectural Pin
Our core compiler is intentionally powered by **`uhtml@4.7.1`**. We deliberately bypass the unoptimized signal-rewrite and conditional array rendering issues present in `uhtml` v5. By locking onto the v4 line, Kitbash achieves raw performance, absolute rendering predictability, and battle-tested DOM-diffing stability natively inside the Shadow DOM without sacrificing syntax ergonomics.

## 2. Dynamic Architecture Diagram & Flow

```text
┌───────────────────────────────┐
│  ComponentConfig (input.ts)   │
│  (Single Source of Truth)     │
└──────────────┬────────────────┘
               │
    [ SDK Compiler Engine ]
               │
       ┌───────┴───────┐
       ▼               ▼
┌──────────────┐ ┌──────────────┐
│ Vanilla WCs  │ │ React 19     │
│ (Shadow DOM) │ │ Wrappers     │
│ (uhtml diff) │ │ (JSX Types)  │
└──────────────┘ └──────────────┘
```

A single, framework-agnostic component definition compiles down to both:
- **Vanilla Custom Elements:** Fully encapsulated with Shadow DOM, leveraging constructable stylesheets (`adoptedStyleSheets`), and lazy, granular state updates via `uhtml`.
- **React 19 Wrappers:** Fully typed, utilizing native JSX element creation, direct slot forwarding, and proxy ref/event binding to pierce the React synthetic event system safely.

## 3. Core Feature Documentation (How It Works)

### Dynamic Slots (Composition)
Kitbash supports seamless composition. The generated vanilla template natively parses and supports standard HTML `<slot>` elements inside our Shadow DOM. When consuming the React wrapper, React's native `children` prop is automatically mapped directly into the underlying web component tag as Light DOM nodes, allowing the browser to project them effortlessly into the targeted slots.

### Theming API (Shadow Parts & CSS Variables)
Our engine provides robust styling hooks that safely pierce Shadow DOM encapsulation:
- **Shadow Parts:** Interactive elements declare a `part` attribute (e.g., `part="button-root"`). Consumers can externally target and style these elements via CSS using `my-button::part(button-root)`.
- **Theme Variables:** We establish a clean token API by declaring custom CSS properties inside the `:host` scope (e.g., `--kitbash-btn-bg`). Consumers simply override these variables globally to theme the entire design system instantly.

### Form Participation & Focus Delegation
Kitbash is engineered for Enterprise Accessibility (WCAG 2.2).
By simply defining `formAssociated: true` in your config, the compiler automatically injects `static formAssociated = true` and binds the native `ElementInternals` API. This allows your custom inputs to seamlessly participate in standard HTML `<form>` submissions and validations. Setting `delegatesFocus: true` ensures that any click on the component automatically proxies focus to the inner `<input>`, guaranteeing native accessibility behaviors out of the box.

### IDE Autocomplete (CEM)
To deliver a world-class developer experience, the SDK compiler automatically harvests all metadata during the build loop—extracting tags, property types, and default values—to generate a standard W3C Custom Elements Manifest (`custom-elements.json`). IDEs like VS Code and WebStorm instantly parse this manifest, providing developers with zero-config hover documentation and autocompletion for all Kitbash components.

## 4. Code Examples: Before and After

### The Authoring Experience (Before)

*Defining a component once using `defineComponent`:*

```typescript
import { defineComponent } from '@kitbash/sdk';

export default defineComponent({
  tag: 'kitbash-input',
  formAssociated: true,
  delegatesFocus: true,
  props: {
    name: { type: String, default: '' },
    value: { type: String, default: '' },
    placeholder: { type: String, default: '' },
  },
  styles: `
    :host {
      display: inline-block;
      --kitbash-input-border: #ccc;
    }
    input {
      border: 1px solid var(--kitbash-input-border);
    }
  `,
  events: {
    'input input'(e: Event, { setState }) {
      const target = e.target as HTMLInputElement;
      setState({ value: target.value });
    }
  },
  render({ props, html }) {
    return html`
      <input
        part="input-root"
        name=${props.name}
        .value=${props.value}
        placeholder=${props.placeholder}
      />
    `;
  }
});
```

### The Runtime Experience (After)

*Consuming the compiled component in **React 19**:*

```tsx
import { useState } from 'react';
import { KitbashInput } from '@kitbash/sdk/react/input';

export function App() {
  const [val, setVal] = useState('');
  
  return (
    <form onSubmit={() => alert(val)}>
      <KitbashInput 
        name="username" 
        value={val} 
        onKitbashChange={(e) => setVal(e.detail.props.value)} 
        placeholder="Enter username" 
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

*Consuming the compiled component in **Svelte 5**:*

```svelte
<script lang="ts">
  import '@kitbash/sdk/vanilla/input.js';
  let val = $state('');
</script>

<form onsubmit={(e) => alert(val)}>
  <kitbash-input 
    name="username" 
    value={val} 
    onkitbash-change={(e) => val = e.detail.props.value}
    placeholder="Enter username">
  </kitbash-input>
  <button type="submit">Submit</button>
</form>
```
