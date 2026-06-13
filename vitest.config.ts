import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    // Integration tests spawn real git processes — allow ample time
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
