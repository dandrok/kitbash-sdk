/** Payload on every user-driven `kitbash-change` event. */
export interface KitbashChangeDetail {
  props: Record<string, unknown>;
  state: Record<string, unknown>;
}

/** Batch update: one re-render, one `kitbash-change`. Prefer over separate setProps+setState. */
export type KitbashCommit = (patch: {
  props?: Record<string, unknown>;
  state?: Record<string, unknown>;
}) => void;

/** uhtml-style tagged template (exact runtime comes from generated code). */
export type KitbashHtml = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => unknown;

export interface KitbashRenderContext {
  props: Record<string, unknown>;
  state: Record<string, unknown>;
  setState: (state: Record<string, unknown>) => void;
  setProps: (props: Record<string, unknown>) => void;
  commit: KitbashCommit;
  html: KitbashHtml;
}

export interface KitbashEventContext {
  props: Record<string, unknown>;
  state: Record<string, unknown>;
  setState: (state: Record<string, unknown>) => void;
  setProps: (props: Record<string, unknown>) => void;
  commit: KitbashCommit;
}

export interface ComponentConfig {
  tag: string;
  formAssociated?: boolean;
  delegatesFocus?: boolean;
  props?: Record<string, { type: unknown; default: unknown }>;
  state?: Record<string, unknown>;
  styles?: string;
  render?: (ctx: KitbashRenderContext) => unknown;
  events?: Record<string, (e: Event, ctx: KitbashEventContext) => void>;
}

export function defineComponent<T extends ComponentConfig>(config: T): T {
  // Evaluation compiler: typed identity. Runtime compiler import()s this object.
  // IMPORTANT: render/events are .toString()'d into generated code — do not close
  // over imports or outer-scope locals; use only props, state, commit/setProps/setState.
  return config;
}

export type { KitbashProjectConfig } from './config.js';
export { loadProjectConfig } from './config.js';
