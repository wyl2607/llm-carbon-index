import { defineConfig, mergeConfig } from 'vitest/config';
// Vite configLoader: 'native' requires explicit file extension in import
import viteConfig from './vite.config.ts';

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
