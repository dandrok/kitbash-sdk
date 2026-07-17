import { compileComponents } from './compiler.js';
import { loadProjectConfig } from './config.js';

/** One full kitbash build for a project directory. Returns resolved config. */
export async function runProjectBuild(projectDir: string) {
  const cfg = await loadProjectConfig(projectDir);
  if (cfg.source !== 'defaults') {
    console.log(`📄 Using config from ${cfg.source}`);
  }
  await compileComponents(projectDir, cfg.outDir, {
    componentsDir: cfg.componentsDir,
    tokensFile: cfg.tokensFile,
    warnIfTokensMissing: cfg.tokensConfigured,
  });
  return cfg;
}
