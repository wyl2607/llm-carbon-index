import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

/// <reference types="vitest" />

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: true,
    },
  })
);
