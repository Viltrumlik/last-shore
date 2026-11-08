import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  server: { port: 5180, strictPort: true, host: '127.0.0.1' },
  preview: { port: 5181, strictPort: true, host: '127.0.0.1' },
  build: { target: 'es2022', assetsInlineLimit: 0, chunkSizeWarningLimit: 900 },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 120000,
    hookTimeout: 120000,
  },
});
