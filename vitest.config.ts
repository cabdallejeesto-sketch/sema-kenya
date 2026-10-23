import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // The content tests build every lesson; that takes a while on GitHub's slower machines.
    testTimeout: 120000,
  },
});
