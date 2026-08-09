import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // `server-only` throws unconditionally outside a Next.js bundler build
      // (it relies on webpack/turbopack aliasing it away); no-op it for tests.
      'server-only': path.resolve(__dirname, 'src/lib/test-support/server-only-stub.ts'),
    },
  },
})
