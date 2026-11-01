import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Tests import the core from source, so `npm test` doesn't need a build first.
  resolve: { alias: { gajian: fileURLToPath(new URL('./packages/gajian/src/index.ts', import.meta.url)) } },
  test: { include: ['packages/*/test/**/*.test.ts'] },
});
