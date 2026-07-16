export interface ComponentConfig {
  tag: string;
  formAssociated?: boolean;
  delegatesFocus?: boolean;
  props?: Record<string, { type: unknown; default: unknown }>;
  state?: Record<string, unknown>;
  styles?: string;
  render?: (ctx: {
    props: Record<string, unknown>;
    state: Record<string, unknown>;
    setState: (state: Record<string, unknown>) => void;
    html: unknown;
  }) => unknown;
  events?: Record<
    string,
    (
      e: Event,
      ctx: {
        state: Record<string, unknown>;
        setState: (state: Record<string, unknown>) => void;
      },
    ) => void
  >;
}

export function defineComponent<T extends ComponentConfig>(config: T): T {
  // In the "Evaluation Compiler" strategy, this acts purely as a factory and type-validator.
  // The runtime compiler will dynamically import the file and extract this returned configuration.
  return config;
}
