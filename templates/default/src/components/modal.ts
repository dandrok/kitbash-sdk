import { defineComponent } from '@ktbsh/sdk';

export default defineComponent({
  tag: 'kitbash-modal',
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: '' },
  },
  styles: `
    :host {
      display: none;
      --kitbash-modal-z: 1000;
      --kitbash-modal-backdrop: rgba(0, 0, 0, 0.45);
      --kitbash-modal-bg: #ffffff;
      --kitbash-modal-radius: 8px;
      --kitbash-modal-padding: 20px;
      --kitbash-modal-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
      --kitbash-modal-title-size: 1.125rem;
      box-sizing: border-box;
    }
    :host([open]) {
      display: flex;
      align-items: center;
      justify-content: center;
      position: fixed;
      inset: 0;
      z-index: var(--kitbash-modal-z);
    }
    .backdrop {
      position: absolute;
      inset: 0;
      background: var(--kitbash-modal-backdrop);
    }
    .panel {
      position: relative;
      min-width: min(320px, calc(100vw - 32px));
      max-width: min(480px, calc(100vw - 32px));
      max-height: calc(100vh - 32px);
      overflow: auto;
      background: var(--kitbash-modal-bg);
      border-radius: var(--kitbash-modal-radius);
      padding: var(--kitbash-modal-padding);
      box-shadow: var(--kitbash-modal-shadow);
      box-sizing: border-box;
    }
    .title {
      margin: 0 0 12px;
      font-size: var(--kitbash-modal-title-size);
      font-weight: 600;
      line-height: 1.3;
    }
    .body {
      display: block;
    }
  `,
  render({ props, html }) {
    return html`
      <div part="modal-backdrop" class="backdrop"></div>
      <div
        part="modal-panel"
        class="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby=${props.title ? 'modal-title' : null}
      >
        ${
          props.title
            ? html`<h2 id="modal-title" part="modal-title" class="title">${props.title}</h2>`
            : null
        }
        <div class="body">
          <slot></slot>
        </div>
      </div>
    `;
  },
});
