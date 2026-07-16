import { defineComponent } from '@ktbsh/sdk';

export default defineComponent({
  tag: 'kitbash-input',
  formAssociated: true,
  delegatesFocus: true,
  props: {
    name: { type: String, default: '' },
    value: { type: String, default: '' },
    placeholder: { type: String, default: '' },
    required: { type: Boolean, default: false },
    invalid: { type: Boolean, default: false },
  },
  state: {
    touched: false,
  },
  styles: `
    :host {
      display: inline-block;
      --kitbash-input-border: #ccc;
      --kitbash-input-border-focus: #0070f3;
      --kitbash-input-border-invalid: #d93025;
      --kitbash-input-padding: 8px 12px;
      --kitbash-input-radius: 4px;
      width: 100%;
    }
    input {
      padding: var(--kitbash-input-padding);
      border: 1px solid var(--kitbash-input-border);
      border-radius: var(--kitbash-input-radius);
      font-size: 1rem;
      outline: none;
      width: 100%;
      box-sizing: border-box;
      font-family: inherit;
    }
    input:focus {
      border-color: var(--kitbash-input-border-focus);
    }
    input[aria-invalid="true"] {
      border-color: var(--kitbash-input-border-invalid);
    }
  `,
  events: {
    'input input'(e: Event, { setState }) {
      const target = e.target as HTMLInputElement;
      const host = (target.getRootNode() as ShadowRoot).host as Element & {
        value: string;
        _internals?: ElementInternals;
      };

      host.value = target.value;
      if (host._internals) {
        host._internals.setFormValue(target.value);
      }

      setState({ touched: true });
    },
  },
  render({ props, state, html }) {
    const isInvalid =
      props.invalid || (props.required && state.touched && !props.value);

    return html`
      <input
        part="input-root"
        name=${props.name}
        .value=${props.value}
        placeholder=${props.placeholder}
        ?required=${props.required}
        aria-invalid=${isInvalid ? 'true' : 'false'}
      />
    `;
  },
});
