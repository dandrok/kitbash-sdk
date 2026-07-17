/**
 * Optional project config for `kitbash build`.
 *
 * Supported (paths relative to project root):
 *   - components  (default: src/components)
 *   - tokens      (default: src/tokens.json)
 *   - outDir      (default: dist)
 *
 * Hard authoring rule: render/events are stringified — no outer closures/imports.
 * See packages/sdk/README.md and docs/SUPPORTED.md.
 */
export default {
  components: './src/components',
  tokens: './src/tokens.json',
  outDir: './dist',
};
