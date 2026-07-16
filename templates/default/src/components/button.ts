import { defineComponent } from '@kitbash/sdk';

export default defineComponent({
  tag: 'my-button',
  props: {
    variant: { type: String, default: 'primary' },
    disabled: { type: Boolean, default: false },
  },
  state: {
    clickCount: 0,
  },
  styles: `
    :host {
      display: inline-block;
      --kitbash-btn-bg: #0070f3;
      --kitbash-btn-color: #ffffff;
      --kitbash-btn-padding: 10px 20px;
      --kitbash-btn-radius: 4px;
    }
    button {
      padding: var(--kitbash-btn-padding);
      border: none;
      border-radius: var(--kitbash-btn-radius);
      cursor: pointer;
      background-color: var(--kitbash-btn-bg);
      color: var(--kitbash-btn-color);
    }
    .primary { background-color: var(--kitbash-btn-bg); }
    .secondary { background-color: #eaeaea; color: black; }
  `,
  render({ props, state, setState, html }) {
    return html`
      <button
        part="button-root"
        class=${props.variant}
        ?disabled=${props.disabled}
        onclick=${() => setState({ clickCount: state.clickCount + 1 })}
      >
        <slot></slot>
        (Clicked: ${state.clickCount})
      </button>
    `;
  },
});
