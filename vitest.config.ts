import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

// Load all variables from .env* files (empty prefix = no VITE_ filter) so
// LOTR_API_KEY reaches process.env and integration tests don't get skipped.
// When .env is absent (e.g. CI without a key) loadEnv returns {} and the
// describe.skipIf guard in integration.test.ts skips those tests as expected.
const env = loadEnv('test', process.cwd(), '');
Object.assign(process.env, env);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'tests/**',
        'examples/**',
        'dist/**',
      ],
    },
  },
});
