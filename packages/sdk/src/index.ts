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

export interface KitbashRenderContext {
  props: Record<string, unknown>;
  state: Record<string, unknown>;
  setState: (state: Record<string, unknown>) => void;
  setProps: (props: Record<string, unknown>) => void;
  commit: KitbashCommit;
  html: unknown;
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
  return config;
}
