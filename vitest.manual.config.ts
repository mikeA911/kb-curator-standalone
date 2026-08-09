// Config for manual, live-integration checks (scripts/*.test.ts) that hit a
// real Supabase project -- kept separate from vitest.config.ts so `npm test`
// never picks these up. Run explicitly:
//   node scripts/run-with-env.mjs -- npx vitest run --config vitest.manual.config.ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/**/*.test.ts'],
    testTimeout: 60000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'server-only': path.resolve(__dirname, 'src/lib/test-support/server-only-stub.ts'),
    },
  },
})
